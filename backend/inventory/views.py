from django.db.models import F
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WarehouseZone, StockItem
from .serializers import WarehouseZoneSerializer, StockItemSerializer

class IsWarehouseManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MANAGER']

class WarehouseZoneViewSet(viewsets.ModelViewSet):
    queryset = WarehouseZone.objects.all().order_by('code')
    serializer_class = WarehouseZoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Only ADMIN and MANAGER can create/update/delete zones
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsWarehouseManagerOrAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='occupancy')
    def occupancy(self, request):
        zones = WarehouseZone.objects.all()
        data = []
        for zone in zones:
            max_cap = float(zone.max_weight_capacity)
            curr_weight = float(zone.current_weight)
            occupancy_rate = round((curr_weight / max_cap) * 100, 2) if max_cap > 0 else 0.0
            item_count = zone.stock_items.count()
            
            data.append({
                "id": zone.id,
                "code": zone.code,
                "name": zone.name,
                "max_weight_capacity": max_cap,
                "current_weight": curr_weight,
                "occupancy_rate": occupancy_rate,
                "item_count": item_count,
            })
        return Response(data)

class StockItemViewSet(viewsets.ModelViewSet):
    queryset = StockItem.objects.all().order_by('sku')
    serializer_class = StockItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Only ADMIN and MANAGER can write stock items
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsWarehouseManagerOrAdmin()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        # Get items where quantity <= low_stock_threshold
        low_stock_items = StockItem.objects.filter(quantity__lte=F('low_stock_threshold'))
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)
