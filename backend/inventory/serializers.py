from rest_framework import serializers
from .models import WarehouseZone, StockItem

class WarehouseZoneSerializer(serializers.ModelSerializer):
    current_weight = serializers.ReadOnlyField()
    occupancy_rate = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseZone
        fields = ['id', 'code', 'name', 'max_weight_capacity', 'description', 'current_weight', 'occupancy_rate']

    def get_occupancy_rate(self, obj):
        max_cap = float(obj.max_weight_capacity)
        if max_cap <= 0:
            return 0.0
        return round((float(obj.current_weight) / max_cap) * 100, 2)

class StockItemSerializer(serializers.ModelSerializer):
    warehouse_zone_code = serializers.ReadOnlyField(source='warehouse_zone.code')
    warehouse_zone_name = serializers.ReadOnlyField(source='warehouse_zone.name')

    class Meta:
        model = StockItem
        fields = [
            'id', 'sku', 'name', 'category', 'quantity', 
            'unit_weight', 'low_stock_threshold', 'warehouse_zone',
            'warehouse_zone_code', 'warehouse_zone_name'
        ]

    def validate(self, data):
        # Prevent overloading the zone weight capacity if zone is updated/assigned
        zone = data.get('warehouse_zone')
        quantity = data.get('quantity', 0)
        unit_weight = data.get('unit_weight', 0)

        # In case of update, get values from instance if they are not passed
        if self.instance:
            # If the field isn't in data, it is not being changed. Use the current value.
            if 'warehouse_zone' not in data:
                zone = self.instance.warehouse_zone
            if 'quantity' not in data:
                quantity = self.instance.quantity
            if 'unit_weight' not in data:
                unit_weight = self.instance.unit_weight

        if zone:
            # Calculate what the new weight would be
            added_weight = float(quantity) * float(unit_weight)
            
            # Exclude current item's weight from calculation if it's already in this zone
            current_zone_weight = float(zone.current_weight)
            if self.instance and self.instance.warehouse_zone == zone:
                current_zone_weight -= float(self.instance.quantity) * float(self.instance.unit_weight)
            
            projected_weight = current_zone_weight + added_weight
            if projected_weight > float(zone.max_weight_capacity):
                raise serializers.ValidationError({
                    "warehouse_zone": f"Cannot assign item to {zone.name}. Adding this item would exceed the zone's max capacity of {zone.max_weight_capacity} kg (Projected: {projected_weight} kg)."
                })
        return data
