"""Service bill service - Business logic for recurring services and bills."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Service,
    ServiceBill,
    Transaction,
    FinancialProduct,
    ProductType,
    TransactionType,
    BillStatus,
)
from app.schemas import (
    ServiceCreate,
    ServiceUpdate,
    ServiceBillCreate,
    ServiceBillUpdate,
    ServiceBillPayRequest,
)


class ServiceBillService:
    """Service for managing recurring services and their bills."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============== Service Methods ==============
    
    async def get_services(
        self,
        user_id: UUID,
        active_only: bool = True
    ) -> List[Service]:
        """Get all services for a user."""
        query = select(Service).where(Service.user_id == user_id)
        
        if active_only:
            query = query.where(Service.active == True)
        
        query = query.order_by(Service.name)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_service(self, service_id: UUID, user_id: UUID) -> Optional[Service]:
        """Get a specific service."""
        result = await self.db.execute(
            select(Service)
            .where(
                and_(
                    Service.id == service_id,
                    Service.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def create_service(self, data: ServiceCreate, user_id: UUID) -> Service:
        """Create a new service."""
        service = Service(
            name=data.name,
            default_amount=data.default_amount,
            default_due_day=data.default_due_day,
            renewal_date=data.renewal_date,
            renewal_note=data.renewal_note,
            active=data.active,
            category_id=data.category_id,
            user_id=user_id
        )
        
        self.db.add(service)
        await self.db.commit()
        await self.db.refresh(service)
        return service
    
    async def update_service(
        self,
        service_id: UUID,
        data: ServiceUpdate,
        user_id: UUID
    ) -> Optional[Service]:
        """Update a service."""
        service = await self.get_service(service_id, user_id)
        if not service:
            return None
        
        if data.name is not None:
            service.name = data.name
        if data.default_amount is not None:
            service.default_amount = data.default_amount
        if data.default_due_day is not None:
            service.default_due_day = data.default_due_day
        if data.renewal_date is not None:
            service.renewal_date = data.renewal_date
        if data.renewal_note is not None:
            service.renewal_note = data.renewal_note
        if data.active is not None:
            service.active = data.active
        if data.category_id is not None:
            service.category_id = data.category_id
        
        await self.db.commit()
        await self.db.refresh(service)
        return service
    
    async def delete_service(self, service_id: UUID, user_id: UUID) -> bool:
        """Delete a service."""
        service = await self.get_service(service_id, user_id)
        if not service:
            return False
        
        await self.db.delete(service)
        await self.db.commit()
        return True
    
    # ============== Bill Methods ==============
    
    async def get_bills(
        self,
        user_id: UUID,
        year: Optional[int] = None,
        month: Optional[int] = None,
        status: Optional[str] = None
    ) -> List[ServiceBill]:
        """Get bills with optional filters."""
        query = select(ServiceBill).where(ServiceBill.user_id == user_id)
        
        if year:
            query = query.where(ServiceBill.year == year)
        if month:
            query = query.where(ServiceBill.month == month)
        if status:
            query = query.where(ServiceBill.status == status)
        
        query = query.order_by(ServiceBill.due_date)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_bill(self, bill_id: UUID, user_id: UUID) -> Optional[ServiceBill]:
        """Get a specific bill."""
        result = await self.db.execute(
            select(ServiceBill)
            .where(
                and_(
                    ServiceBill.id == bill_id,
                    ServiceBill.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def get_or_create_monthly_bills(
        self,
        user_id: UUID,
        year: int,
        month: int
    ) -> List[ServiceBill]:
        """
        Get bills for a specific month, creating them if they don't exist.
        """
        # First, get existing bills for this month
        result = await self.db.execute(
            select(ServiceBill)
            .where(
                and_(
                    ServiceBill.user_id == user_id,
                    ServiceBill.year == year,
                    ServiceBill.month == month
                )
            )
        )
        existing_bills = {bill.service_id: bill for bill in result.scalars().all()}
        
        # Get all active services
        services = await self.get_services(user_id, active_only=True)
        
        bills = []
        
        for service in services:
            if service.id in existing_bills:
                # Use existing bill
                bills.append(existing_bills[service.id])
            else:
                # Create new bill for this service
                due_day = service.default_due_day or 15
                
                # Create due date
                try:
                    due_date = datetime(year, month, due_day)
                except ValueError:
                    # Handle month with fewer days
                    if month == 2:
                        due_date = datetime(year, month, 28)
                    else:
                        due_date = datetime(year, month, 30)
                
                bill = ServiceBill(
                    due_date=due_date,
                    amount=service.default_amount or Decimal("0"),
                    status=BillStatus.PENDING,
                    month=month,
                    year=year,
                    service_id=service.id,
                    user_id=user_id
                )
                
                self.db.add(bill)
                bills.append(bill)
        
        if len(bills) > len(existing_bills):
            # New bills were created
            await self.db.commit()
            for bill in bills:
                if bill.id:  # Only refresh if committed
                    await self.db.refresh(bill)
        
        return bills
    
    async def create_bill(
        self,
        data: ServiceBillCreate,
        user_id: UUID
    ) -> ServiceBill:
        """Create a new bill manually."""
        # Verify service exists
        service = await self.get_service(data.service_id, user_id)
        if not service:
            raise ValueError("Service not found")
        
        # Check if bill already exists for this service/month/year
        result = await self.db.execute(
            select(ServiceBill)
            .where(
                and_(
                    ServiceBill.service_id == data.service_id,
                    ServiceBill.year == data.year,
                    ServiceBill.month == data.month,
                    ServiceBill.user_id == user_id
                )
            )
        )
        if result.scalar_one_or_none():
            raise ValueError("Bill already exists for this service and period")
        
        bill = ServiceBill(
            due_date=data.due_date,
            amount=data.amount,
            status=data.status,
            month=data.month,
            year=data.year,
            service_id=data.service_id,
            user_id=user_id
        )
        
        self.db.add(bill)
        await self.db.commit()
        await self.db.refresh(bill)
        return bill
    
    async def update_bill(
        self,
        bill_id: UUID,
        data: ServiceBillUpdate,
        user_id: UUID
    ) -> Optional[ServiceBill]:
        """Update a bill."""
        bill = await self.get_bill(bill_id, user_id)
        if not bill:
            return None
        
        if data.amount is not None:
            bill.amount = data.amount
        if data.due_date is not None:
            bill.due_date = data.due_date
        if data.status is not None:
            bill.status = data.status
        
        await self.db.commit()
        await self.db.refresh(bill)
        return bill
    
    async def pay_bill(
        self,
        bill_id: UUID,
        data: ServiceBillPayRequest,
        user_id: UUID
    ) -> Transaction:
        """Pay a bill, creating a transaction."""
        bill = await self.get_bill(bill_id, user_id)
        if not bill:
            raise ValueError("Bill not found")
        
        if bill.status == BillStatus.PAID:
            raise ValueError("Bill is already paid")
        
        # Get payment product
        result = await self.db.execute(
            select(FinancialProduct)
            .where(
                and_(
                    FinancialProduct.id == data.from_product_id,
                    FinancialProduct.user_id == user_id
                )
            )
        )
        product = result.scalar_one_or_none()
        
        if not product:
            raise ValueError("Payment product not found")
        
        if product.product_type in [ProductType.CREDIT_CARD, ProductType.LOAN]:
            raise ValueError("Cannot pay from a credit card or loan")
        
        # Calculate amount
        amount = data.amount if data.amount is not None else bill.amount
        
        # Check balance
        if product.balance < amount:
            raise ValueError(
                f"Insufficient balance. Available: ${float(product.balance):.2f}"
            )
        
        # Create transaction
        transaction = Transaction(
            amount=amount,
            date=datetime.now(),
            description=f"Pago {bill.service.name}",
            transaction_type=TransactionType.EXPENSE,
            category_id=bill.service.category_id,
            user_id=user_id,
            from_product_id=data.from_product_id
        )
        
        self.db.add(transaction)
        await self.db.flush()
        
        # Update bill
        bill.status = BillStatus.PAID
        bill.transaction_id = transaction.id
        
        # Update product balance
        product.balance -= amount
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    async def delete_bill(self, bill_id: UUID, user_id: UUID) -> bool:
        """Delete a bill."""
        bill = await self.get_bill(bill_id, user_id)
        if not bill:
            return False
        
        await self.db.delete(bill)
        await self.db.commit()
        return True
    
    async def skip_bill(self, bill_id: UUID, user_id: UUID) -> Optional[ServiceBill]:
        """Mark a bill as skipped (won't pay this month)."""
        bill = await self.get_bill(bill_id, user_id)
        if not bill:
            return None
        
        if bill.status == BillStatus.PAID:
            raise ValueError("Cannot skip a paid bill")
        
        bill.status = BillStatus.SKIPPED
        await self.db.commit()
        await self.db.refresh(bill)
        return bill
