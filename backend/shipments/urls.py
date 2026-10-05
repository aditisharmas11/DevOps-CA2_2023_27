from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet, GoodsReceiptNoteViewSet, DispatchOrderViewSet

router = DefaultRouter()
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'grns', GoodsReceiptNoteViewSet, basename='grn')
router.register(r'dispatches', DispatchOrderViewSet, basename='dispatch')

urlpatterns = [
    path('', include(router.urls)),
]
