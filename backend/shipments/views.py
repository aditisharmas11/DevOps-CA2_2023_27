from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from .models import (
    PurchaseOrder, GoodsReceiptNote, DispatchOrder, DeliveryStatusLog
)
from .serializers import (
    PurchaseOrderSerializer, GoodsReceiptNoteSerializer, DispatchOrderSerializer
)

class IsWarehouseManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MANAGER']

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-order_date')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Only ADMIN/MANAGER can create, edit, or delete POs
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsWarehouseManagerOrAdmin()]
        return super().get_permissions()

class GoodsReceiptNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceiptNote.objects.all().order_by('-received_date')
    serializer_class = GoodsReceiptNoteSerializer
    permission_classes = [IsWarehouseManagerOrAdmin]  # Only Managers/Admins handle GRNs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

class DispatchOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DispatchOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Delivery Agents can only see dispatches assigned to them
        if user.role == 'AGENT':
            return DispatchOrder.objects.filter(delivery_agent=user).order_by('-expected_delivery_date')
        # Admins and Managers can see all dispatches
        return DispatchOrder.objects.all().order_by('-expected_delivery_date')

    def get_permissions(self):
        # Only ADMIN/MANAGER can create or delete dispatch orders
        if self.action in ['create', 'destroy']:
            return [IsWarehouseManagerOrAdmin()]
        return super().get_permissions()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)
        
        with transaction.atomic():
            # State Transition: Transitioning to DISPATCHED triggers stock deductions
            if old_status == 'PENDING' and new_status in ['DISPATCHED', 'IN_TRANSIT','DELIVERED']:
                for item in instance.items.all():
                    stock_item = item.stock_item
                    if stock_item.quantity < item.quantity:
                        # Return 400 Bad Request via serializer validation error
                        raise serializer.ValidationError({
                            "status": f"Cannot dispatch. Insufficient stock for {stock_item.name}. Available: {stock_item.quantity}, Required: {item.quantity}"
                        })
                    stock_item.quantity -= item.quantity
                    stock_item.save()

            # State Transition: When marked DELIVERED, capture actual delivery timestamp
            if new_status == 'DELIVERED' and old_status != 'DELIVERED':
                serializer.validated_data['actual_delivery_date'] = timezone.now()

            # Save the dispatch order updates
            updated_dispatch = serializer.save()

            # Generate Status Audit Log
            notes = f"Status changed from {old_status} to {new_status}."
            if old_status == 'PENDING' and new_status in ['DISPATCHED', 'IN_TRANSIT']:
                notes += " Stock quantities deducted from inventory."
            
            DeliveryStatusLog.objects.create(
                dispatch_order=updated_dispatch,
                status=new_status,
                updated_by=self.request.user,
                notes=notes
            )

    @action(detail=False, methods=['get'], url_path='performance')
    def performance(self, request):
        total_dispatches = DispatchOrder.objects.count()
        
        # Pending deliveries: not DELIVERED and not FAILED
        pending_deliveries = DispatchOrder.objects.filter(
            status__in=['PENDING', 'DISPATCHED', 'IN_TRANSIT']
        ).count()
        
        # On-time delivery rate
        delivered_orders = DispatchOrder.objects.filter(status='DELIVERED')
        total_delivered = delivered_orders.count()
        
        on_time_delivered = 0
        for order in delivered_orders:
            if order.actual_delivery_date and order.expected_delivery_date:
                if order.actual_delivery_date <= order.expected_delivery_date:
                    on_time_delivered += 1
                    
        on_time_rate = round((on_time_delivered / total_delivered) * 100, 2) if total_delivered > 0 else 0.0
        
        return Response({
            "total_dispatches": total_dispatches,
            "pending_deliveries": pending_deliveries,
            "delivered_count": total_delivered,
            "on_time_delivered_count": on_time_delivered,
            "on_time_delivery_rate": on_time_rate
        })
