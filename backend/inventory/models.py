from django.db import models
from django.db.models import Sum, F

class WarehouseZone(models.Model):
    code = models.CharField(max_length=10, unique=True,)
    name = models.CharField(max_length=100)
    max_weight_capacity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Max capacity in kg")
    description = models.TextField(blank=True, null=True)

    @property
    def current_weight(self):
        # Calculate current total weight of all items stored in this zone
        result = self.stock_items.aggregate(
            total_weight=Sum(F('quantity') * F('unit_weight'), output_field=models.DecimalField())
        )
        return result['total_weight'] or 0.0

    def __str__(self):
        return f"{self.name} ({self.code})"

class StockItem(models.Model):
    sku = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    quantity = models.IntegerField(default=0)
    unit_weight = models.DecimalField(max_digits=6, decimal_places=2, help_text="Weight of a single unit in kg")
    low_stock_threshold = models.IntegerField(default=10)
    warehouse_zone = models.ForeignKey(
        WarehouseZone,
        related_name='stock_items',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.sku})"
