from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from inventory.models import WarehouseZone, StockItem
from shipments.models import (
    PurchaseOrder, PurchaseOrderItem, 
    DispatchOrder, DispatchOrderItem, 
    DeliveryStatusLog
)

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds database with initial users, zones, stock items, purchase orders, and dispatches."

    def handle(self, *args, **options):
        self.stdout.write("Wiping old data...")
        with transaction.atomic():
            # Delete old data to enable clean re-runs
            DeliveryStatusLog.objects.all().delete()
            DispatchOrderItem.objects.all().delete()
            DispatchOrder.objects.all().delete()
            PurchaseOrderItem.objects.all().delete()
            PurchaseOrder.objects.all().delete()
            StockItem.objects.all().delete()
            WarehouseZone.objects.all().delete()
            User.objects.exclude(is_superuser=True).delete()

            self.stdout.write("Seeding users...")
            # Create default users
            admin_user = User.objects.create_user(
                username="admin",
                email="admin@logistics.com",
                password="password123",
                role="ADMIN",
                phone="+15550100"
            )
            manager_user = User.objects.create_user(
                username="manager",
                email="manager@logistics.com",
                password="password123",
                role="MANAGER",
                phone="+15550101"
            )
            agent_user = User.objects.create_user(
                username="agent",
                email="agent@logistics.com",
                password="password123",
                role="AGENT",
                phone="+15550102"
            )

            self.stdout.write("Seeding warehouse zones...")
            # Create zones
            zone_a = WarehouseZone.objects.create(
                code="ZONE-A",
                name="Cold Storage",
                max_weight_capacity=1000.00,
                description="Perishable goods temperature controlled zone (-18C to 4C)"
            )
            zone_b = WarehouseZone.objects.create(
                code="ZONE-B",
                name="Electronics Area",
                max_weight_capacity=5000.00,
                description="General electronics shelving unit with security tags"
            )
            zone_c = WarehouseZone.objects.create(
                code="ZONE-C",
                name="Bulk Goods",
                max_weight_capacity=15000.00,
                description="Pallet racks for heavy cargo and machinery storage"
            )

            self.stdout.write("Seeding stock items...")
            # Create stock items (some in low-stock status)
            seafood = StockItem.objects.create(
                sku="SKU-COLD-01",
                name="Frozen Seafood Pack",
                category="Perishables",
                quantity=100,
                unit_weight=2.50,          # Total: 250kg
                low_stock_threshold=20,
                warehouse_zone=zone_a
            )
            vaccine = StockItem.objects.create(
                sku="SKU-COLD-02",
                name="Vaccine Storage Tube",
                category="Medical",
                quantity=5,                # Low stock alert!
                unit_weight=0.10,          # Total: 0.5kg
                low_stock_threshold=10,
                warehouse_zone=zone_a
            )

            laptop = StockItem.objects.create(
                sku="SKU-ELEC-01",
                name="Vapor 15 Laptop",
                category="Electronics",
                quantity=150,
                unit_weight=1.80,          # Total: 270kg
                low_stock_threshold=15,
                warehouse_zone=zone_b
            )
            monitor = StockItem.objects.create(
                sku="SKU-ELEC-02",
                name="Vapor Display 27",
                category="Electronics",
                quantity=8,                # Low stock alert!
                unit_weight=6.50,          # Total: 52kg
                low_stock_threshold=10,
                warehouse_zone=zone_b
            )

            engine = StockItem.objects.create(
                sku="SKU-HEAVY-01",
                name="Industrial Motor Engine",
                category="Machinery",
                quantity=10,
                unit_weight=450.00,        # Total: 4500kg
                low_stock_threshold=2,
                warehouse_zone=zone_c
            )

            self.stdout.write("Seeding purchase orders...")
            # Create PO 1 (Pending)
            po1 = PurchaseOrder.objects.create(
                po_number="PO-2026-0001",
                supplier="Global Logistics Corp",
                status="PENDING",
                expected_delivery_date=timezone.now() + timedelta(days=5)
            )
            PurchaseOrderItem.objects.create(purchase_order=po1, stock_item=seafood, quantity_ordered=50)
            PurchaseOrderItem.objects.create(purchase_order=po1, stock_item=monitor, quantity_ordered=10)

            # Create PO 2 (Pending)
            po2 = PurchaseOrder.objects.create(
                po_number="PO-2026-0002",
                supplier="Tech Distributors Inc",
                status="PENDING",
                expected_delivery_date=timezone.now() + timedelta(days=3)
            )
            PurchaseOrderItem.objects.create(purchase_order=po2, stock_item=laptop, quantity_ordered=40)

            self.stdout.write("Seeding dispatches...")
            # Dispatch 1 (Pending Assignment)
            disp1 = DispatchOrder.objects.create(
                order_number="DISP-2026-0001",
                destination="Vapor Retail Store #4, New York",
                expected_delivery_date=timezone.now() + timedelta(days=2),
                status="PENDING",
                delivery_agent=agent_user
            )
            DispatchOrderItem.objects.create(dispatch_order=disp1, stock_item=laptop, quantity=5)
            DispatchOrderItem.objects.create(dispatch_order=disp1, stock_item=monitor, quantity=2)
            DeliveryStatusLog.objects.create(
                dispatch_order=disp1,
                status="PENDING",
                updated_by=manager_user,
                notes="Dispatch order registered, agent assigned."
            )

            # Dispatch 2 (Delivered on time)
            disp2 = DispatchOrder.objects.create(
                order_number="DISP-2026-0002",
                destination="Apex Tech Warehouse, New Jersey",
                expected_delivery_date=timezone.now() - timedelta(hours=6),
                actual_delivery_date=timezone.now() - timedelta(hours=8),
                status="DELIVERED",
                delivery_agent=agent_user
            )
            DispatchOrderItem.objects.create(dispatch_order=disp2, stock_item=seafood, quantity=10)
            DeliveryStatusLog.objects.create(
                dispatch_order=disp2,
                status="PENDING",
                updated_by=manager_user,
                notes="Order logged."
            )
            DeliveryStatusLog.objects.create(
                dispatch_order=disp2,
                status="DISPATCHED",
                updated_by=manager_user,
                notes="Deducted 10 Seafood packs from inventory."
            )
            # Subtract seafood quantity manually for this seeded delivered dispatch
            seafood.quantity -= 10
            seafood.save()

            DeliveryStatusLog.objects.create(
                dispatch_order=disp2,
                status="DELIVERED",
                updated_by=agent_user,
                notes="Delivered to receptionist on duty. On-time."
            )

            self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
            self.stdout.write(
                f"\nTest Accounts Created (Password: 'password123'):"
                f"\n- Admin: admin"
                f"\n- Manager: manager"
                f"\n- Delivery Agent: agent"
            )
