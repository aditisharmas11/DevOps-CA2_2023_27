from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseZoneViewSet, StockItemViewSet

router = DefaultRouter()
router.register(r'zones', WarehouseZoneViewSet, basename='zone')
router.register(r'items', StockItemViewSet, basename='item')

urlpatterns = [
    path('', include(router.urls)),
]
