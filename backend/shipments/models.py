from django.db import models
from django.conf import settings
from inventory.models import StockItem

class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('RECEIVED', 'Fully Received'),
        ('PARTIAL', 'Partially Received'),
    )
    po_number = models.CharField(max_length=50, unique=True)
    supplier = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    order_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.po_number} - {self.supplier}"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, related_name='items', on_delete=models.CASCADE)
    stock_item = models.ForeignKey(StockItem, on_delete=models.CASCADE)
    quantity_ordered = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.purchase_order.po_number}: {self.stock_item.name} x {self.quantity_ordered}"

class GoodsReceiptNote(models.Model):
    grn_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, related_name='grns', on_delete=models.CASCADE)
    received_date = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='received_grns'
    )

    def __str__(self):
        return f"{self.grn_number} (PO: {self.purchase_order.po_number})"

class GRNItem(models.Model):
    grn = models.ForeignKey(GoodsReceiptNote, related_name='items', on_delete=models.CASCADE)
    stock_item = models.ForeignKey(StockItem, on_delete=models.CASCADE)
    quantity_received = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.grn.grn_number}: {self.stock_item.name} x {self.quantity_received}"

class DispatchOrder(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Assignment'),
        ('DISPATCHED', 'Dispatched'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
    )
    order_number = models.CharField(max_length=50, unique=True)
    destination = models.CharField(max_length=255)
    expected_delivery_date = models.DateTimeField()
    actual_delivery_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    delivery_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatches'
    )

    def __str__(self):
        return f"{self.order_number} to {self.destination} ({self.status})"

class DispatchOrderItem(models.Model):
    dispatch_order = models.ForeignKey(DispatchOrder, related_name='items', on_delete=models.CASCADE)
    stock_item = models.ForeignKey(StockItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.dispatch_order.order_number}: {self.stock_item.name} x {self.quantity}"

class DeliveryStatusLog(models.Model):
    dispatch_order = models.ForeignKey(DispatchOrder, related_name='status_logs', on_delete=models.CASCADE)
    status = models.CharField(max_length=20)
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='status_change_logs'
    )
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.dispatch_order.order_number} - {self.status} at {self.timestamp}"
