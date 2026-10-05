from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, AgentListView, UserManagementViewSet

router = DefaultRouter()
router.register('users', UserManagementViewSet, basename='user')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('agents/', AgentListView.as_view(), name='agent_list'),
    path('', include(router.urls)),
]
