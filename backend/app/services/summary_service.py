"""Summary service - Business logic for credit card summaries."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from sqlalchemy import select, and_, desc, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CreditCardSummary,
    SummaryItem,
    SummaryAdjustment,
    Transaction,
    FinancialProduct,
    ProductType,
    TransactionType,
    SummaryStatus,
    AdjustmentType,
)
from app.schemas import (
    CreditCardSummaryCreate,
    CreditCardSummaryUpdate,
    SummaryAdjustmentCreate,
    SummaryPayRequest,
)


class SummaryService:
    """Service for managing credit card summaries."""
    
    BA_TZ = "America/Argentina/Buenos_Aires"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _calculate_summary_dates(
        self,
        year: int,
        month: int,
        closing_day: int,
        due_day: int
    ) -> Tuple[datetime, datetime]:
        """Calculate closing and due dates for a summary."""
        # Closing date is in the current month
        closing_date = datetime(year, month, closing_day, 23, 59, 59)
        
        # Due date is typically in the next month (or same if due_day > closing_day)
        due_month = month
        due_year = year
        
        if due_day <= closing_day:
            # Due date is in the next month
            due_month = month + 1
            if due_month > 12:
                due_month = 1
                due_year = year + 1
        
        due_date = datetime(due_year, due_month, due_day, 23, 59, 59)
        
        return closing_date, due_date
    
    async def _get_product(self, product_id: UUID, user_id: UUID) -> Optional[FinancialProduct]:
        """Get a product."""
        result = await self.db.execute(
            select(FinancialProduct)
            .where(
                and_(
                    FinancialProduct.id == product_id,
                    FinancialProduct.user_id == user_id,
                    FinancialProduct.product_type == ProductType.CREDIT_CARD
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def get_summaries(
        self,
        product_id: UUID,
        user_id: UUID,
        status: Optional[str] = None
    ) -> List[CreditCardSummary]:
        """Get all summaries for a credit card."""
        query = select(CreditCardSummary).where(
            and_(
                CreditCardSummary.product_id == product_id,
                CreditCardSummary.user_id == user_id
            )
        )
        
        if status:
            query = query.where(CreditCardSummary.status == status)
        
        query = query.order_by(desc(CreditCardSummary.year), desc(CreditCardSummary.month))
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_summary(
        self,
        summary_id: UUID,
        user_id: UUID
    ) -> Optional[CreditCardSummary]:
        """Get a specific summary with all details."""
        result = await self.db.execute(
            select(CreditCardSummary)
            .where(
                and_(
                    CreditCardSummary.id == summary_id,
                    CreditCardSummary.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def generate_summary(
        self,
        data: CreditCardSummaryCreate,
        user_id: UUID
    ) -> CreditCardSummary:
        """Generate or update a summary for a specific month."""
        # Get the credit card product
        product = await self._get_product(data.product_id, user_id)
        if not product:
            raise ValueError("Credit card not found")
        
        closing_day = product.closing_day or 15
        due_day = product.due_day or 5
        
        # Check if summary already exists
        result = await self.db.execute(
            select(CreditCardSummary)
            .where(
                and_(
                    CreditCardSummary.product_id == data.product_id,
                    CreditCardSummary.year == data.year,
                    CreditCardSummary.month == data.month,
                    CreditCardSummary.user_id == user_id
                )
            )
        )
        summary = result.scalar_one_or_none()
        
        if summary:
            # If already closed or paid, don't recalculate
            if summary.status in [SummaryStatus.CLOSED, SummaryStatus.PAID]:
                return summary
        else:
            # Create new summary
            closing_date, due_date = self._calculate_summary_dates(
                data.year, data.month, closing_day, due_day
            )
            
            summary = CreditCardSummary(
                product_id=data.product_id,
                year=data.year,
                month=data.month,
                closing_date=closing_date,
                due_date=due_date,
                status=SummaryStatus.DRAFT,
                user_id=user_id,
                institution_id=product.institution_id
            )
            self.db.add(summary)
            await self.db.flush()
        
        # Recalculate transactions for draft summaries
        if summary.status == SummaryStatus.DRAFT:
            await self._recalculate_summary(summary, closing_day)
        
        await self.db.commit()
        await self.db.refresh(summary)
        return summary
    
    async def _recalculate_summary(
        self,
        summary: CreditCardSummary,
        closing_day: int
    ) -> None:
        """Recalculate summary items and totals."""
        # Calculate previous closing date
        prev_month = summary.month - 1
        prev_year = summary.year
        if prev_month < 1:
            prev_month = 12
            prev_year = summary.year - 1
        
        prev_closing_date = datetime(prev_year, prev_month, closing_day, 23, 59, 59)
        
        # Find all transactions in the period
        # From previous closing to this closing
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.from_product_id == summary.product_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.user_id == summary.user_id,
                    Transaction.date > prev_closing_date,
                    Transaction.date <= summary.closing_date
                )
            )
        )
        transactions = result.scalars().all()
        
        # Get current items
        result = await self.db.execute(
            select(SummaryItem)
            .where(SummaryItem.summary_id == summary.id)
        )
        existing_items = {item.transaction_id: item for item in result.scalars().all()}
        
        # Track which transactions should be in summary
        current_tx_ids = set()
        
        for transaction in transactions:
            current_tx_ids.add(transaction.id)
            
            if transaction.id in existing_items:
                # Update amount if changed
                existing_items[transaction.id].amount = transaction.amount
            else:
                # Create new item
                item = SummaryItem(
                    summary_id=summary.id,
                    transaction_id=transaction.id,
                    amount=transaction.amount,
                    is_reconciled=False,
                    has_discrepancy=False
                )
                self.db.add(item)
        
        # Remove items for transactions no longer in period
        for tx_id, item in existing_items.items():
            if tx_id not in current_tx_ids:
                await self.db.delete(item)
        
        # Recalculate totals
        calculated_amount = sum(tx.amount for tx in transactions)
        
        # Get adjustments
        result = await self.db.execute(
            select(SummaryAdjustment)
            .where(SummaryAdjustment.summary_id == summary.id)
        )
        adjustments = result.scalars().all()
        adjustments_amount = sum(adj.amount for adj in adjustments)
        
        # Update summary
        summary.calculated_amount = calculated_amount
        summary.adjustments_amount = adjustments_amount
        summary.total_amount = calculated_amount + adjustments_amount
    
    async def add_adjustment(
        self,
        summary_id: UUID,
        data: SummaryAdjustmentCreate,
        user_id: UUID
    ) -> SummaryAdjustment:
        """Add an adjustment to a summary."""
        summary = await self.get_summary(summary_id, user_id)
        if not summary:
            raise ValueError("Summary not found")
        
        if summary.status == SummaryStatus.PAID:
            raise ValueError("Cannot modify a paid summary")
        
        # Handle credit adjustments (negative)
        amount = data.amount
        if data.adjustment_type == AdjustmentType.CREDIT:
            amount = -abs(amount)
        else:
            amount = abs(amount)
        
        adjustment = SummaryAdjustment(
            summary_id=summary_id,
            adjustment_type=data.adjustment_type,
            description=data.description,
            amount=amount
        )
        
        self.db.add(adjustment)
        
        # Update summary totals
        summary.adjustments_amount += amount
        summary.total_amount = summary.calculated_amount + summary.adjustments_amount
        
        await self.db.commit()
        await self.db.refresh(adjustment)
        return adjustment
    
    async def delete_adjustment(
        self,
        adjustment_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete an adjustment."""
        result = await self.db.execute(
            select(SummaryAdjustment)
            .join(CreditCardSummary)
            .where(
                and_(
                    SummaryAdjustment.id == adjustment_id,
                    CreditCardSummary.user_id == user_id
                )
            )
        )
        adjustment = result.scalar_one_or_none()
        
        if not adjustment:
            return False
        
        summary = adjustment.summary
        if summary.status == SummaryStatus.PAID:
            raise ValueError("Cannot modify a paid summary")
        
        # Update summary totals
        summary.adjustments_amount -= adjustment.amount
        summary.total_amount = summary.calculated_amount + summary.adjustments_amount
        
        await self.db.delete(adjustment)
        await self.db.commit()
        return True
    
    async def close_summary(
        self,
        summary_id: UUID,
        user_id: UUID
    ) -> CreditCardSummary:
        """Close a summary (mark as ready to pay)."""
        summary = await self.get_summary(summary_id, user_id)
        if not summary:
            raise ValueError("Summary not found")
        
        if summary.status != SummaryStatus.DRAFT:
            raise ValueError("Summary must be in draft status to close")
        
        summary.status = SummaryStatus.CLOSED
        summary.is_closed = True
        
        await self.db.commit()
        await self.db.refresh(summary)
        return summary
    
    async def pay_summary(
        self,
        summary_id: UUID,
        data: SummaryPayRequest,
        user_id: UUID
    ) -> Transaction:
        """
        Pay a summary.
        This processes Plan Z, creates payment transaction, and updates balances.
        """
        summary = await self.get_summary(summary_id, user_id)
        if not summary:
            raise ValueError("Summary not found")
        
        if summary.status == SummaryStatus.PAID:
            raise ValueError("Summary is already paid")
        
        # Get source account (where payment comes from)
        result = await self.db.execute(
            select(FinancialProduct)
            .where(
                and_(
                    FinancialProduct.id == data.from_product_id,
                    FinancialProduct.user_id == user_id
                )
            )
        )
        from_product = result.scalar_one_or_none()
        
        if not from_product:
            raise ValueError("Payment account not found")
        
        if from_product.product_type in [ProductType.CREDIT_CARD, ProductType.LOAN]:
            raise ValueError("Cannot pay from a credit card or loan")
        
        # Get credit card
        credit_card = summary.product
        
        payment_date = data.payment_date or datetime.now()
        
        # --- PLAN Z PROCESSING ---
        adjustments_for_plan_z = Decimal("0")
        
        # Get items with Plan Z transactions
        result = await self.db.execute(
            select(SummaryItem)
            .join(Transaction)
            .where(
                and_(
                    SummaryItem.summary_id == summary.id,
                    Transaction.plan_z == True
                )
            )
        )
        plan_z_items = result.scalars().all()
        
        for item in plan_z_items:
            original_tx = item.transaction
            installment_amount = original_tx.amount / 3
            new_installment_id = uuid4()
            
            # Create 3 installments
            for i in range(3):
                tx_date = original_tx.date
                if i > 0:
                    # Add months for future installments
                    tx_date = self._add_months(original_tx.date, i)
                
                new_tx = Transaction(
                    amount=installment_amount,
                    date=tx_date,
                    description=f"{original_tx.description} (Plan Z {i+1}/3)",
                    transaction_type=TransactionType.EXPENSE,
                    from_product_id=original_tx.from_product_id,
                    category_id=original_tx.category_id,
                    user_id=user_id,
                    installment_number=i+1,
                    installment_total=3,
                    installment_id=new_installment_id,
                    plan_z=False  # Don't process again
                )
                
                self.db.add(new_tx)
                await self.db.flush()
                
                # Add first installment to this summary
                if i == 0:
                    new_item = SummaryItem(
                        summary_id=summary.id,
                        transaction_id=new_tx.id,
                        amount=installment_amount,
                        is_reconciled=False
                    )
                    self.db.add(new_item)
            
            # Delete original transaction (cascade deletes item)
            await self.db.delete(original_tx)
            
            # Calculate adjustment
            adjustments_for_plan_z += (original_tx.amount - installment_amount)
        
        # Recalculate totals after Plan Z processing
        result = await self.db.execute(
            select(SummaryItem)
            .where(SummaryItem.summary_id == summary.id)
        )
        items = result.scalars().all()
        
        new_calculated = sum(item.amount for item in items)
        amount_to_pay = new_calculated + summary.adjustments_amount
        
        # Validate sufficient balance
        if from_product.balance < amount_to_pay:
            raise ValueError(
                f"Insufficient balance. Available: ${float(from_product.balance):.2f}, "
                f"Required: ${float(amount_to_pay):.2f}"
            )
        
        # Update summary totals
        summary.calculated_amount = new_calculated
        summary.total_amount = amount_to_pay
        
        # Create payment transaction
        payment_tx = Transaction(
            amount=amount_to_pay,
            date=payment_date,
            description=f"Pago Resumen {credit_card.name} {summary.month}/{summary.year}",
            transaction_type=TransactionType.TRANSFER,
            user_id=user_id,
            from_product_id=data.from_product_id,
            to_product_id=summary.product_id,
            status="COMPLETED"
        )
        
        self.db.add(payment_tx)
        await self.db.flush()
        
        # Update balances
        from_product.balance -= amount_to_pay
        credit_card.balance += amount_to_pay  # Reduce debt (balance is negative for credit cards)
        
        # Create expense transactions for adjustments
        result = await self.db.execute(
            select(SummaryAdjustment)
            .where(SummaryAdjustment.summary_id == summary.id)
        )
        adjustments = result.scalars().all()
        
        for adj in adjustments:
            if adj.amount > 0:  # Only positive amounts (costs)
                adj_tx = Transaction(
                    amount=adj.amount,
                    date=payment_date,
                    description=f"{adj.description} (Resumen {summary.month}/{summary.year})",
                    transaction_type=TransactionType.EXPENSE,
                    from_product_id=data.from_product_id,
                    user_id=user_id,
                    status="COMPLETED"
                )
                self.db.add(adj_tx)
        
        # Mark summary as paid
        summary.status = SummaryStatus.PAID
        summary.is_closed = True
        summary.paid_date = payment_date
        summary.paid_from_product_id = data.from_product_id
        summary.payment_transaction_id = payment_tx.id
        
        await self.db.commit()
        await self.db.refresh(payment_tx)
        
        return payment_tx
    
    async def get_projected_summaries(
        self,
        product_id: UUID,
        user_id: UUID,
        months_ahead: int = 12
    ) -> List[dict]:
        """Get projected summaries for upcoming months based on future installments."""
        product = await self._get_product(product_id, user_id)
        if not product:
            raise ValueError("Credit card not found")
        
        closing_day = product.closing_day or 15
        due_day = product.due_day or 5
        
        now = datetime.now()
        
        # Get all future installment transactions
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.from_product_id == product_id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.date > now,
                    Transaction.user_id == user_id
                )
            )
            .order_by(Transaction.date)
        )
        future_transactions = result.scalars().all()
        
        projections = []
        
        for i in range(months_ahead):
            proj_month = now.month + i
            proj_year = now.year
            
            while proj_month > 12:
                proj_month -= 12
                proj_year += 1
            
            # Calculate period for this month
            closing_date, _ = self._calculate_summary_dates(
                proj_year, proj_month, closing_day, due_day
            )
            
            prev_month = proj_month - 1
            prev_year = proj_year
            if prev_month < 1:
                prev_month = 12
                prev_year = proj_year - 1
            
            prev_closing = datetime(prev_year, prev_month, closing_day, 23, 59, 59)
            
            # Find transactions in this period
            period_transactions = [
                tx for tx in future_transactions
                if prev_closing < tx.date <= closing_date
            ]
            
            amount = sum(tx.amount for tx in period_transactions)
            
            projections.append({
                "year": proj_year,
                "month": proj_month,
                "amount": amount,
                "transaction_count": len(period_transactions)
            })
        
        return projections
    
    async def reset_summary(
        self,
        summary_id: UUID,
        user_id: UUID
    ) -> CreditCardSummary:
        """Reset a summary (remove all items and adjustments)."""
        summary = await self.get_summary(summary_id, user_id)
        if not summary:
            raise ValueError("Summary not found")
        
        if summary.status == SummaryStatus.PAID:
            raise ValueError("Cannot reset a paid summary")
        
        # Delete all items
        await self.db.execute(
            select(SummaryItem)
            .where(SummaryItem.summary_id == summary_id)
        )
        result = await self.db.execute(
            select(SummaryItem)
            .where(SummaryItem.summary_id == summary_id)
        )
        for item in result.scalars().all():
            await self.db.delete(item)
        
        # Delete all adjustments
        result = await self.db.execute(
            select(SummaryAdjustment)
            .where(SummaryAdjustment.summary_id == summary_id)
        )
        for adj in result.scalars().all():
            await self.db.delete(adj)
        
        # Reset totals
        summary.calculated_amount = Decimal("0")
        summary.adjustments_amount = Decimal("0")
        summary.total_amount = Decimal("0")
        summary.status = SummaryStatus.DRAFT
        summary.is_closed = False
        
        await self.db.commit()
        await self.db.refresh(summary)
        return summary
    
    @staticmethod
    def _add_months(date: datetime, months: int) -> datetime:
        """Add months to a date, handling year rollover."""
        month = date.month - 1 + months
        year = date.year + month // 12
        month = month % 12 + 1
        
        day = min(date.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        
        return date.replace(year=year, month=month, day=day)
