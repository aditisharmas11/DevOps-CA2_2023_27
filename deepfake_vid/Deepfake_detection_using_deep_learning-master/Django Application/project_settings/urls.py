"""project_settings URL Configuration
"""
from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', include('ml_app.urls')),
    path('', include('django_prometheus.urls')),  # Exposes /metrics for Prometheus (Step 4)
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
