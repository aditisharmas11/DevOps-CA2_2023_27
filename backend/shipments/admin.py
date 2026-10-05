from django.contrib import admin
from .models import (
    PurchaseOrder, PurchaseOrderItem, 
    GoodsReceiptNote, GRNItem, 
    DispatchOrder, DispatchOrderItem, 
    DeliveryStatusLog
)

admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(GoodsReceiptNote)
admin.site.register(GRNItem)
admin.site.register(DispatchOrder)
admin.site.register(DispatchOrderItem)
admin.site.register(DeliveryStatusLog)
