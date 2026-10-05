from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum
from inventory.models import StockItem, WarehouseZone
from .models import (
    PurchaseOrder, PurchaseOrderItem, 
    GoodsReceiptNote, GRNItem, 
    DispatchOrder, DispatchOrderItem, 
    DeliveryStatusLog
)
from django.contrib.auth import get_user_model
User = get_user_model()

class UserMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'phone']

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    stock_item_name = serializers.ReadOnlyField(source='stock_item.name')
    stock_item_sku = serializers.ReadOnlyField(source='stock_item.sku')

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'stock_item', 'stock_item_name', 'stock_item_sku', 'quantity_ordered']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'po_number', 'supplier', 'status', 'order_date', 'expected_delivery_date', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        with transaction.atomic():
            purchase_order = PurchaseOrder.objects.create(**validated_data)
            for item_data in items_data:
                PurchaseOrderItem.objects.create(purchase_order=purchase_order, **item_data)
        return purchase_order

class GRNItemSerializer(serializers.ModelSerializer):
    stock_item_name = serializers.ReadOnlyField(source='stock_item.name')
    stock_item_sku = serializers.ReadOnlyField(source='stock_item.sku')

    class Meta:
        model = GRNItem
        fields = ['id', 'stock_item', 'stock_item_name', 'stock_item_sku', 'quantity_received']

class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    items = GRNItemSerializer(many=True)
    received_by_username = serializers.ReadOnlyField(source='received_by.username')
    purchase_order_number = serializers.ReadOnlyField(source='purchase_order.po_number')

    class Meta:
        model = GoodsReceiptNote
        fields = ['id', 'grn_number', 'purchase_order', 'purchase_order_number', 'received_date', 'received_by', 'received_by_username', 'items']
        read_only_fields = ['received_by']

    def validate(self, data):
        po = data.get('purchase_order')
        items_data = data.get('items', [])

        if not items_data:
            raise serializers.ValidationError("A GRN must contain at least one item.")

        # Check if the items in the GRN actually belong to the PO
        po_item_mappings = {item.stock_item_id: item.quantity_ordered for item in po.items.all()}
        for item_data in items_data:
            stock_item = item_data['stock_item']
            if stock_item.id not in po_item_mappings:
                raise serializers.ValidationError(
                    f"Item {stock_item.name} is not part of Purchase Order {po.po_number}."
                )

        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        po = validated_data['purchase_order']

        with transaction.atomic():
            # 1. Create the GRN
            grn = GoodsReceiptNote.objects.create(received_by=user, **validated_data)

            # 2. Process each received item, update stock & check zone capacity
            for item_data in items_data:
                stock_item = item_data['stock_item']
                qty_received = item_data['quantity_received']

                # Create GRN Item record
                GRNItem.objects.create(grn=grn, stock_item=stock_item, quantity_received=qty_received)

                # Check zone weight capacity
                zone = stock_item.warehouse_zone
                if zone:
                    added_weight = float(qty_received) * float(stock_item.unit_weight)
                    projected_weight = float(zone.current_weight) + added_weight
                    if projected_weight > float(zone.max_weight_capacity):
                        raise serializers.ValidationError(
                            f"Adding {qty_received} units of {stock_item.name} would exceed Zone {zone.code} capacity of {zone.max_weight_capacity} kg (Projected: {projected_weight} kg)."
                        )

                # Update the stock quantity
                stock_item.quantity += qty_received
                stock_item.save()

            # 3. Update parent Purchase Order Status
            total_ordered = sum(item.quantity_ordered for item in po.items.all())
            total_received = GRNItem.objects.filter(grn__purchase_order=po).aggregate(
                total=Sum('quantity_received')
            )['total'] or 0

            if total_received >= total_ordered:
                po.status = 'RECEIVED'
            elif total_received > 0:
                po.status = 'PARTIAL'
            po.save()

        return grn

class DispatchOrderItemSerializer(serializers.ModelSerializer):
    stock_item_name = serializers.ReadOnlyField(source='stock_item.name')
    stock_item_sku = serializers.ReadOnlyField(source='stock_item.sku')

    class Meta:
        model = DispatchOrderItem
        fields = ['id', 'stock_item', 'stock_item_name', 'stock_item_sku', 'quantity']

class DeliveryStatusLogSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.ReadOnlyField(source='updated_by.username')

    class Meta:
        model = DeliveryStatusLog
        fields = ['id', 'status', 'timestamp', 'updated_by', 'updated_by_username', 'notes']

class DispatchOrderSerializer(serializers.ModelSerializer):
    items = DispatchOrderItemSerializer(many=True)
    status_logs = DeliveryStatusLogSerializer(many=True, read_only=True)
    delivery_agent_detail = UserMinSerializer(source='delivery_agent', read_only=True)

    class Meta:
        model = DispatchOrder
        fields = [
            'id', 'order_number', 'destination', 'expected_delivery_date', 
            'actual_delivery_date', 'status', 'delivery_agent', 
            'delivery_agent_detail', 'items', 'status_logs'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        status = validated_data.get('status', 'PENDING')
        user = self.context['request'].user

        with transaction.atomic():
            dispatch_order = DispatchOrder.objects.create(**validated_data)

            for item_data in items_data:
                DispatchOrderItem.objects.create(dispatch_order=dispatch_order, **item_data)

            DeliveryStatusLog.objects.create(
                dispatch_order=dispatch_order,
                status=status,
                updated_by=user,
                notes="Dispatch order created."
            )

            # If status is DISPATCHED directly on creation, subtract stock
            if status == 'DISPATCHED':
                for item_data in items_data:
                    stock_item = item_data['stock_item']
                    qty = item_data['quantity']
                    if stock_item.quantity < qty:
                        raise serializers.ValidationError(
                            f"Insufficient stock for {stock_item.name} (SKU: {stock_item.sku}). In stock: {stock_item.quantity}, Requested: {qty}."
                        )
                    stock_item.quantity -= qty
                    stock_item.save()

        return dispatch_order
