from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Warehouse Manager'),
        ('AGENT', 'Delivery Agent'),
    )
    EMPLOYMENT_STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('FORMER', 'Former Employee'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='AGENT')
    phone = models.CharField(max_length=15, blank=True, null=True)
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default='ACTIVE')

    def __str__(self):
        return f"{self.username} ({self.role})"