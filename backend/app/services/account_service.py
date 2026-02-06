"""Account service - Business logic for institutions and products."""

from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    FinancialInstitution,
    FinancialProduct,
    InstitutionType,
    ProductType,
    Currency,
    User,
)
from app.schemas import (
    FinancialInstitutionCreate,
    FinancialInstitutionUpdate,
    FinancialProductCreate,
    FinancialProductUpdate,
)


class AccountService:
    """Service for managing financial institutions and products."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============== Institution Methods ==============
    
    async def get_institutions(self, user_id: UUID) -> List[FinancialInstitution]:
        """Get all institutions for a user."""
        result = await self.db.execute(
            select(FinancialInstitution)
            .where(FinancialInstitution.user_id == user_id)
            .order_by(FinancialInstitution.name)
        )
        return result.scalars().all()
    
    async def get_institution(self, institution_id: UUID, user_id: UUID) -> Optional[FinancialInstitution]:
        """Get a specific institution."""
        result = await self.db.execute(
            select(FinancialInstitution)
            .where(
                and_(
                    FinancialInstitution.id == institution_id,
                    FinancialInstitution.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def create_institution(
        self, 
        data: FinancialInstitutionCreate, 
        user_id: UUID
    ) -> FinancialInstitution:
        """Create a new institution."""
        institution = FinancialInstitution(
            name=data.name,
            institution_type=data.institution_type,
            share_summary=data.share_summary,
            user_id=user_id
        )
        self.db.add(institution)
        await self.db.commit()
        await self.db.refresh(institution)
        return institution
    
    async def update_institution(
        self,
        institution_id: UUID,
        data: FinancialInstitutionUpdate,
        user_id: UUID
    ) -> Optional[FinancialInstitution]:
        """Update an institution."""
        institution = await self.get_institution(institution_id, user_id)
        if not institution:
            return None
        
        if data.name is not None:
            institution.name = data.name
        if data.share_summary is not None:
            institution.share_summary = data.share_summary
        
        await self.db.commit()
        await self.db.refresh(institution)
        return institution
    
    async def delete_institution(self, institution_id: UUID, user_id: UUID) -> bool:
        """Delete an institution."""
        institution = await self.get_institution(institution_id, user_id)
        if not institution:
            return False
        
        await self.db.delete(institution)
        await self.db.commit()
        return True
    
    # ============== Product Methods ==============
    
    async def get_products(
        self, 
        user_id: UUID, 
        institution_id: Optional[UUID] = None
    ) -> List[FinancialProduct]:
        """Get all products for a user."""
        query = select(FinancialProduct).where(FinancialProduct.user_id == user_id)
        
        if institution_id:
            query = query.where(FinancialProduct.institution_id == institution_id)
        
        query = query.order_by(FinancialProduct.name)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_product(self, product_id: UUID, user_id: UUID) -> Optional[FinancialProduct]:
        """Get a specific product with relations."""
        result = await self.db.execute(
            select(FinancialProduct)
            .where(
                and_(
                    FinancialProduct.id == product_id,
                    FinancialProduct.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def create_product(
        self,
        data: FinancialProductCreate,
        user_id: UUID
    ) -> FinancialProduct:
        """Create a new financial product."""
        # Validate institution if provided
        if data.institution_id:
            institution = await self.get_institution(data.institution_id, user_id)
            if not institution:
                raise ValueError("Institution not found")
        
        # Validate linked product for debit cards
        if data.product_type == ProductType.DEBIT_CARD and data.linked_product_id:
            linked_product = await self.get_product(data.linked_product_id, user_id)
            if not linked_product:
                raise ValueError("Linked product not found")
            if linked_product.product_type not in [
                ProductType.SAVINGS_ACCOUNT,
                ProductType.CHECKING_ACCOUNT
            ]:
                raise ValueError("Debit card must be linked to a savings or checking account")
        
        # Validate credit card fields
        if data.product_type == ProductType.CREDIT_CARD:
            if data.closing_day is None or data.due_day is None:
                raise ValueError("Credit cards must have closing and due days")
        
        product = FinancialProduct(
            name=data.name,
            product_type=data.product_type,
            currency=data.currency,
            balance=data.balance,
            closing_day=data.closing_day,
            due_day=data.due_day,
            limit_amount=data.limit_amount,
            limit_single_payment=data.limit_single_payment,
            limit_installments=data.limit_installments,
            shared_limit=data.shared_limit,
            unified_limit=data.unified_limit,
            last_four_digits=data.last_four_digits,
            expiration_date=data.expiration_date,
            provider=data.provider,
            institution_id=data.institution_id,
            linked_product_id=data.linked_product_id,
            user_id=user_id
        )
        
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product
    
    async def update_product(
        self,
        product_id: UUID,
        data: FinancialProductUpdate,
        user_id: UUID
    ) -> Optional[FinancialProduct]:
        """Update a product."""
        product = await self.get_product(product_id, user_id)
        if not product:
            return None
        
        # Update fields
        if data.name is not None:
            product.name = data.name
        if data.closing_day is not None:
            product.closing_day = data.closing_day
        if data.due_day is not None:
            product.due_day = data.due_day
        if data.limit_amount is not None:
            product.limit_amount = data.limit_amount
        if data.limit_single_payment is not None:
            product.limit_single_payment = data.limit_single_payment
        if data.limit_installments is not None:
            product.limit_installments = data.limit_installments
        if data.shared_limit is not None:
            product.shared_limit = data.shared_limit
        if data.unified_limit is not None:
            product.unified_limit = data.unified_limit
        if data.last_four_digits is not None:
            product.last_four_digits = data.last_four_digits
        if data.expiration_date is not None:
            product.expiration_date = data.expiration_date
        if data.provider is not None:
            product.provider = data.provider
        if data.linked_product_id is not None:
            product.linked_product_id = data.linked_product_id
        
        await self.db.commit()
        await self.db.refresh(product)
        return product
    
    async def delete_product(self, product_id: UUID, user_id: UUID) -> bool:
        """Delete a product."""
        product = await self.get_product(product_id, user_id)
        if not product:
            return False
        
        await self.db.delete(product)
        await self.db.commit()
        return True
    
    # ============== Utility Methods ==============
    
    async def ensure_user_exists(self, user_id: UUID, email: str) -> User:
        """Ensure user exists in database."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(id=user_id, email=email, name="Demo User")
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        
        return user
