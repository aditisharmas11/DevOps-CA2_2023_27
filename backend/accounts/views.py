from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer, UserManagementSerializer
from rest_framework import views, viewsets, permissions
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AgentListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        agents = User.objects.filter(role='AGENT')
        data = [{"id": u.id, "username": u.username, "phone": u.phone} for u in agents]
        return Response(data)


class IsAdminRole(permissions.BasePermission):
    """Only allows users with role='ADMIN' to access"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for user management. Only accessible by ADMIN users.
    DELETE performs a soft-delete: marks the user as a Former Employee
    and blocks their login by setting is_active=False.
    """
    serializer_class = UserManagementSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')

    def perform_destroy(self, instance):
        # Soft-delete: mark as former employee and block login
        instance.is_active = False
        instance.employment_status = 'FORMER'
        instance.save()
