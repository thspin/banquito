"""Transaction service - Business logic for transactions and transfers."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Transaction,
    FinancialProduct,
    TransactionType,
    ProductType,
    Category,
)
from app.schemas import TransactionCreate, TransactionUpdate, TransferCreate


class TransactionService:
    """Service for managing transactions, including installments and transfers."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_transactions(
        self,
        user_id: UUID,
        product_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        transaction_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Transaction]:
        """Get transactions with optional filters."""
        query = select(Transaction).where(Transaction.user_id == user_id)
        
        if product_id:
            query = query.where(
                and_(
                    Transaction.from_product_id == product_id,
                    Transaction.transaction_type.in_([TransactionType.EXPENSE, TransactionType.TRANSFER])
                )
            )
        
        if category_id:
            query = query.where(Transaction.category_id == category_id)
        
        if transaction_type:
            query = query.where(Transaction.transaction_type == transaction_type)
        
        query = query.order_by(desc(Transaction.date))
        query = query.offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_transaction(self, transaction_id: UUID, user_id: UUID) -> Optional[Transaction]:
        """Get a specific transaction."""
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.id == transaction_id,
                    Transaction.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def get_installment_group(
        self,
        installment_id: UUID,
        user_id: UUID
    ) -> List[Transaction]:
        """Get all transactions in an installment group."""
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.installment_id == installment_id,
                    Transaction.user_id == user_id
                )
            )
            .order_by(Transaction.installment_number)
        )
        return result.scalars().all()
    
    async def _get_product(self, product_id: UUID, user_id: UUID) -> Optional[FinancialProduct]:
        """Helper to get a product."""
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
    
    async def _validate_credit_card_limit(
        self,
        product: FinancialProduct,
        amount: Decimal,
        is_installment: bool
    ) -> None:
        """Validate credit card has sufficient limit."""
        if product.product_type != ProductType.CREDIT_CARD:
            return
        
        # Check if product has any limits set
        has_limits = (
            product.limit_amount is not None or
            product.limit_single_payment is not None or
            product.limit_installments is not None
        )
        
        if not has_limits:
            return
        
        available = product.available_limit
        
        if product.unified_limit:
            # Unified limit check
            if available < amount:
                raise ValueError(
                    f"Insufficient credit limit. Available: ${float(available):.2f}, "
                    f"Required: ${float(amount):.2f}"
                )
        else:
            # Separate limits for single payment and installments
            if is_installment:
                limit = product.limit_installments or product.limit_amount or Decimal("0")
                current_balance = abs(product.balance) if product.balance < 0 else Decimal("0")
                available_installment = limit - current_balance
                
                if available_installment < amount:
                    raise ValueError(
                        f"Insufficient installment limit. Available: ${float(available_installment):.2f}, "
                        f"Required: ${float(amount):.2f}"
                    )
            else:
                limit = product.limit_single_payment or product.limit_amount or Decimal("0")
                current_balance = abs(product.balance) if product.balance < 0 else Decimal("0")
                available_single = limit - current_balance
                
                if available_single < amount:
                    raise ValueError(
                        f"Insufficient single payment limit. Available: ${float(available_single):.2f}, "
                        f"Required: ${float(amount):.2f}"
                    )
    
    async def _update_product_balance(
        self,
        product: FinancialProduct,
        amount_change: Decimal
    ) -> None:
        """Update product balance."""
        product.balance += amount_change
        
        # Update limits for credit cards
        if product.product_type == ProductType.CREDIT_CARD:
            has_limits = (
                product.limit_single_payment is not None or
                product.limit_installments is not None or
                product.limit_amount is not None
            )
            
            if has_limits:
                if product.unified_limit:
                    if product.limit_single_payment is not None:
                        product.limit_single_payment += amount_change
                    if product.limit_installments is not None:
                        product.limit_installments += amount_change
                else:
                    # Update the specific limit that was used
                    # This is simplified - in real scenario track which limit was used
                    if product.limit_single_payment is not None:
                        product.limit_single_payment += amount_change
    
    async def create_transaction(
        self,
        data: TransactionCreate,
        user_id: UUID
    ) -> List[Transaction]:
        """
        Create a transaction with optional installments.
        Returns list of created transactions (one per installment).
        """
        # Get source product
        product = await self._get_product(data.from_product_id, user_id)
        if not product:
            raise ValueError("Source product not found")
        
        # Validate transaction type for product
        if data.transaction_type == TransactionType.INCOME:
            if product.product_type in [ProductType.CREDIT_CARD, ProductType.LOAN]:
                raise ValueError("Cannot add income to credit cards or loans")
        
        # Calculate installment details
        installments = data.installments or 1
        is_installment = installments > 1
        
        if is_installment and product.product_type != ProductType.CREDIT_CARD:
            raise ValueError("Installments only allowed for credit cards")
        
        # Generate installment group ID if needed
        installment_id = uuid4() if is_installment else None
        installment_amount = data.amount / installments
        total_amount = data.amount
        
        # Validate limits for credit cards
        if product.product_type == ProductType.CREDIT_CARD:
            await self._validate_credit_card_limit(product, total_amount, is_installment)
        
        # Validate debit card has linked account with sufficient balance
        if product.product_type == ProductType.DEBIT_CARD:
            if not product.linked_product_id:
                raise ValueError("Debit card must be linked to an account")
            
            linked_product = await self._get_product(product.linked_product_id, user_id)
            if not linked_product:
                raise ValueError("Linked account not found")
            
            if linked_product.balance < total_amount:
                raise ValueError(
                    f"Insufficient balance in linked account. "
                    f"Available: ${float(linked_product.balance):.2f}"
                )
        
        # Create transactions (one per installment)
        created_transactions = []
        
        for i in range(installments):
            # Calculate date for this installment
            transaction_date = data.date
            if i > 0:
                # Add months for future installments
                transaction_date = self._add_months(data.date, i)
            
            # Build description
            description = data.description
            if is_installment:
                description = f"{data.description} (Cuota {i+1}/{installments})"
            
            transaction = Transaction(
                amount=installment_amount,
                date=transaction_date,
                description=description,
                transaction_type=data.transaction_type,
                category_id=data.category_id,
                user_id=user_id,
                from_product_id=data.from_product_id if data.transaction_type == TransactionType.EXPENSE else None,
                to_product_id=data.from_product_id if data.transaction_type == TransactionType.INCOME else None,
                installment_number=i+1 if is_installment else None,
                installment_total=installments if is_installment else None,
                installment_id=installment_id,
                plan_z=data.plan_z if i == 0 else False,  # Plan Z only on first installment
            )
            
            self.db.add(transaction)
            created_transactions.append(transaction)
        
        # Update product balance
        balance_change = -total_amount if data.transaction_type == TransactionType.EXPENSE else total_amount
        
        if product.product_type == ProductType.DEBIT_CARD:
            # Update linked account balance
            linked_product = await self._get_product(product.linked_product_id, user_id)
            linked_product.balance += balance_change
        else:
            await self._update_product_balance(product, balance_change)
        
        await self.db.commit()
        
        # Refresh all transactions
        for transaction in created_transactions:
            await self.db.refresh(transaction)
        
        return created_transactions
    
    async def update_transaction(
        self,
        transaction_id: UUID,
        data: TransactionUpdate,
        user_id: UUID
    ) -> Optional[Transaction]:
        """Update a transaction."""
        transaction = await self.get_transaction(transaction_id, user_id)
        if not transaction:
            return None
        
        # Calculate amount difference
        old_amount = transaction.amount
        new_amount = data.amount if data.amount is not None else old_amount
        amount_diff = new_amount - old_amount
        
        # Update transaction fields
        if data.amount is not None:
            transaction.amount = data.amount
        if data.date is not None:
            transaction.date = data.date
        if data.description is not None:
            transaction.description = data.description
        if data.category_id is not None:
            transaction.category_id = data.category_id
        if data.plan_z is not None:
            transaction.plan_z = data.plan_z
        
        # If amount changed, update product balance
        if amount_diff != 0:
            if transaction.from_product_id:
                product = await self._get_product(transaction.from_product_id, user_id)
                if product:
                    if transaction.transaction_type == TransactionType.EXPENSE:
                        await self._update_product_balance(product, -amount_diff)
                    elif transaction.transaction_type == TransactionType.INCOME:
                        await self._update_product_balance(product, amount_diff)
        
        # If part of installment group, update category for all
        if transaction.installment_id and data.category_id is not None:
            await self.db.execute(
                select(Transaction)
                .where(
                    and_(
                        Transaction.installment_id == transaction.installment_id,
                        Transaction.user_id == user_id
                    )
                )
            )
            # Would need to update all here
        
        await self.db.commit()
        await self.db.refresh(transaction)
        return transaction
    
    async def delete_transaction(self, transaction_id: UUID, user_id: UUID) -> bool:
        """Delete a transaction and revert balance changes."""
        transaction = await self.get_transaction(transaction_id, user_id)
        if not transaction:
            return False
        
        # Revert balance changes
        if transaction.from_product_id:
            product = await self._get_product(transaction.from_product_id, user_id)
            if product:
                if transaction.transaction_type == TransactionType.EXPENSE:
                    # Revert expense - add money back
                    await self._update_product_balance(product, transaction.amount)
                elif transaction.transaction_type == TransactionType.INCOME:
                    # Revert income - subtract money
                    await self._update_product_balance(product, -transaction.amount)
        
        if transaction.to_product_id and transaction.transaction_type == TransactionType.TRANSFER:
            product = await self._get_product(transaction.to_product_id, user_id)
            if product:
                await self._update_product_balance(product, -transaction.amount)
        
        await self.db.delete(transaction)
        await self.db.commit()
        return True
    
    async def create_transfer(self, data: TransferCreate, user_id: UUID) -> Transaction:
        """Create a transfer between products."""
        # Validate source product
        from_product = await self._get_product(data.from_product_id, user_id)
        if not from_product:
            raise ValueError("Source product not found")
        
        # Validate destination product
        to_product = await self._get_product(data.to_product_id, user_id)
        if not to_product:
            raise ValueError("Destination product not found")
        
        # Check source has sufficient balance
        if from_product.balance < data.amount:
            raise ValueError(
                f"Insufficient balance. Available: ${float(from_product.balance):.2f}"
            )
        
        # Create transfer transaction
        transaction = Transaction(
            amount=data.amount,
            date=data.date,
            description=data.description,
            transaction_type=TransactionType.TRANSFER,
            user_id=user_id,
            from_product_id=data.from_product_id,
            to_product_id=data.to_product_id
        )
        
        # Update balances
        from_product.balance -= data.amount
        to_product.balance += data.amount
        
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    @staticmethod
    def _add_months(date: datetime, months: int) -> datetime:
        """Add months to a date, handling year rollover."""
        month = date.month - 1 + months
        year = date.year + month // 12
        month = month % 12 + 1
        
        # Handle day overflow (e.g., Jan 31 + 1 month = Feb 28)
        day = min(date.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        
        return date.replace(year=year, month=month, day=day)
