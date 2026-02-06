"""Database models for Tuli Finance application."""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# Enums
class TransactionType(str, PyEnum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"


class InstitutionType(str, PyEnum):
    BANK = "BANK"
    WALLET = "WALLET"


class ProductType(str, PyEnum):
    CASH = "CASH"
    SAVINGS_ACCOUNT = "SAVINGS_ACCOUNT"
    CHECKING_ACCOUNT = "CHECKING_ACCOUNT"
    DEBIT_CARD = "DEBIT_CARD"
    CREDIT_CARD = "CREDIT_CARD"
    LOAN = "LOAN"


class Currency(str, PyEnum):
    ARS = "ARS"
    USD = "USD"
    USDT = "USDT"
    USDC = "USDC"
    BTC = "BTC"


class CategoryType(str, PyEnum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class CardProvider(str, PyEnum):
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"
    AMEX = "AMEX"
    OTHER = "OTHER"


class SummaryStatus(str, PyEnum):
    DRAFT = "DRAFT"
    CLOSED = "CLOSED"
    PAID = "PAID"


class AdjustmentType(str, PyEnum):
    COMMISSION = "COMMISSION"
    TAX = "TAX"
    INTEREST = "INTEREST"
    INSURANCE = "INSURANCE"
    CREDIT = "CREDIT"
    OTHER = "OTHER"


class BillStatus(str, PyEnum):
    PENDING = "PENDING"
    PAID = "PAID"
    SKIPPED = "SKIPPED"


class ServiceBenefitType(str, PyEnum):
    DISCOUNT = "DISCOUNT"
    CASHBACK = "CASHBACK"


# Models
class User(Base):
    """User model."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    summaries = relationship("CreditCardSummary", back_populates="user", cascade="all, delete-orphan")
    institutions = relationship("FinancialInstitution", back_populates="user", cascade="all, delete-orphan")
    products = relationship("FinancialProduct", back_populates="user", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="user", cascade="all, delete-orphan")
    service_bills = relationship("ServiceBill", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


class Category(Base):
    """Transaction category model."""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    icon = Column(String(100), nullable=True)
    category_type = Column(String(20), default=CategoryType.EXPENSE.value, nullable=False)
    is_system = Column(Boolean, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    services = relationship("Service", back_populates="category")

    def __repr__(self):
        return f"<Category {self.name}>"


class FinancialInstitution(Base):
    """Financial institution model (banks, wallets)."""
    __tablename__ = "financial_institutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    institution_type = Column(String(20), nullable=False)  # InstitutionType
    share_summary = Column(Boolean, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint per user
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_institution_user_name"),
    )

    # Relationships
    user = relationship("User", back_populates="institutions")
    products = relationship("FinancialProduct", back_populates="institution", cascade="all, delete-orphan")
    summaries = relationship("CreditCardSummary", back_populates="institution")

    def __repr__(self):
        return f"<FinancialInstitution {self.name}>"


class FinancialProduct(Base):
    """Financial product model (accounts, cards, cash)."""
    __tablename__ = "financial_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    product_type = Column(String(30), nullable=False)  # ProductType
    currency = Column(String(10), default=Currency.ARS.value, nullable=False)  # Currency
    balance = Column(Numeric(15, 2), default=Decimal("0.00"))
    
    # Credit card specific fields
    closing_day = Column(Integer, nullable=True)
    due_day = Column(Integer, nullable=True)
    limit_amount = Column(Numeric(15, 2), nullable=True)  # Renamed from 'limit'
    limit_single_payment = Column(Numeric(15, 2), nullable=True)
    limit_installments = Column(Numeric(15, 2), nullable=True)
    shared_limit = Column(Boolean, default=False)
    unified_limit = Column(Boolean, default=False)
    last_four_digits = Column(String(4), nullable=True)
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    provider = Column(String(20), nullable=True)  # CardProvider
    
    # Relations
    institution_id = Column(UUID(as_uuid=True), ForeignKey("financial_institutions.id", ondelete="CASCADE"), nullable=True)
    linked_product_id = Column(UUID(as_uuid=True), ForeignKey("financial_products.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("institution_id", "name", "currency", "user_id", name="uq_product_institution_name_currency"),
    )

    # Relationships
    user = relationship("User", back_populates="products")
    institution = relationship("FinancialInstitution", back_populates="products")
    linked_product = relationship("FinancialProduct", remote_side=[id], backref="linked_by_products")
    
    transactions_origin = relationship("Transaction", foreign_keys="Transaction.from_product_id", back_populates="from_product")
    transactions_dest = relationship("Transaction", foreign_keys="Transaction.to_product_id", back_populates="to_product")
    paid_summaries = relationship("CreditCardSummary", foreign_keys="CreditCardSummary.paid_from_product_id", back_populates="paid_from_product")
    summaries = relationship("CreditCardSummary", foreign_keys="CreditCardSummary.product_id", back_populates="product")
    payment_rules = relationship("ServicePaymentRule", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FinancialProduct {self.name} ({self.currency})>"
    
    @property
    def available_limit(self) -> Decimal:
        """Calculate available credit limit."""
        if self.product_type != ProductType.CREDIT_CARD.value:
            return Decimal("0")
        
        limit = self.limit_amount or Decimal("0")
        return limit + self.balance  # balance is negative for credit cards


class Transaction(Base):
    """Transaction model (income, expense, transfer)."""
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    amount = Column(Numeric(15, 2), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(String(500), nullable=False)
    status = Column(String(50), default="COMPLETED")
    plan_z = Column(Boolean, default=False)
    transaction_type = Column(String(20), nullable=False)  # TransactionType
    
    # Installment fields
    installment_number = Column(Integer, nullable=True)
    installment_total = Column(Integer, nullable=True)
    installment_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Relations
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    from_product_id = Column(UUID(as_uuid=True), ForeignKey("financial_products.id"), nullable=True)
    to_product_id = Column(UUID(as_uuid=True), ForeignKey("financial_products.id"), nullable=True)
    service_bill_id = Column(UUID(as_uuid=True), ForeignKey("service_bills.id"), nullable=True, unique=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes
    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_installment", "installment_id"),
    )

    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    from_product = relationship("FinancialProduct", foreign_keys=[from_product_id], back_populates="transactions_origin")
    to_product = relationship("FinancialProduct", foreign_keys=[to_product_id], back_populates="transactions_dest")
    service_bill = relationship("ServiceBill", back_populates="transaction")
    summary_items = relationship("SummaryItem", back_populates="transaction", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Transaction {self.description} ${self.amount}>"


class CreditCardSummary(Base):
    """Credit card monthly summary model."""
    __tablename__ = "credit_card_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    closing_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    total_amount = Column(Numeric(15, 2), default=Decimal("0.00"))
    calculated_amount = Column(Numeric(15, 2), default=Decimal("0.00"))
    adjustments_amount = Column(Numeric(15, 2), default=Decimal("0.00"))
    is_closed = Column(Boolean, default=False)
    status = Column(String(20), default=SummaryStatus.DRAFT.value)  # SummaryStatus
    paid_date = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    institution_id = Column(UUID(as_uuid=True), ForeignKey("financial_institutions.id"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("financial_products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    paid_from_product_id = Column(UUID(as_uuid=True), ForeignKey("financial_products.id"), nullable=True)
    payment_transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True, unique=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("institution_id", "product_id", "year", "month", name="uq_summary_institution_product_year_month"),
        Index("ix_summaries_user_product", "user_id", "product_id"),
    )

    # Relationships
    user = relationship("User", back_populates="summaries")
    institution = relationship("FinancialInstitution", back_populates="summaries")
    product = relationship("FinancialProduct", foreign_keys=[product_id], back_populates="summaries")
    paid_from_product = relationship("FinancialProduct", foreign_keys=[paid_from_product_id], back_populates="paid_summaries")
    payment_transaction = relationship("Transaction", foreign_keys=[payment_transaction_id])
    items = relationship("SummaryItem", back_populates="summary", cascade="all, delete-orphan")
    adjustments = relationship("SummaryAdjustment", back_populates="summary", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CreditCardSummary {self.month}/{self.year} ${self.total_amount}>"


class SummaryItem(Base):
    """Individual transaction item in a summary."""
    __tablename__ = "summary_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    amount = Column(Numeric(15, 2), nullable=False)
    is_reconciled = Column(Boolean, default=False)
    has_discrepancy = Column(Boolean, default=False)
    note = Column(Text, nullable=True)
    
    # Relations
    summary_id = Column(UUID(as_uuid=True), ForeignKey("credit_card_summaries.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("summary_id", "transaction_id", name="uq_summary_item_summary_transaction"),
    )

    # Relationships
    summary = relationship("CreditCardSummary", back_populates="items")
    transaction = relationship("Transaction", back_populates="summary_items")

    def __repr__(self):
        return f"<SummaryItem ${self.amount}>"


class SummaryAdjustment(Base):
    """Adjustment to a summary (taxes, fees, etc.)."""
    __tablename__ = "summary_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    adjustment_type = Column(String(30), nullable=False)  # AdjustmentType
    description = Column(String(500), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Relations
    summary_id = Column(UUID(as_uuid=True), ForeignKey("credit_card_summaries.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    summary = relationship("CreditCardSummary", back_populates="adjustments")

    def __repr__(self):
        return f"<SummaryAdjustment {self.adjustment_type} ${self.amount}>"


class Service(Base):
    """Recurring service/subscription model."""
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    default_amount = Column(Numeric(15, 2), nullable=True)
    default_due_day = Column(Integer, nullable=True)
    renewal_date = Column(DateTime(timezone=True), nullable=True)
    renewal_note = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    
    # Relations
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="services")
    category = relationship("Category", back_populates="services")
    bills = relationship("ServiceBill", back_populates="service", cascade="all, delete-orphan")
    payment_rules = relationship("ServicePaymentRule", back_populates="service", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Service {self.name}>"


class ServiceBill(Base):
    """Monthly bill for a service."""
    __tablename__ = "service_bills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    due_date = Column(DateTime(timezone=True), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    status = Column(String(20), default=BillStatus.PENDING.value)  # BillStatus
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    
    # Relations
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True, unique=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("service_id", "year", "month", name="uq_service_bill_service_year_month"),
    )

    # Relationships
    user = relationship("User", back_populates="service_bills")
    service = relationship("Service", back_populates="bills")
    transaction = relationship("Transaction", back_populates="service_bill")

    def __repr__(self):
        return f"<ServiceBill {self.service.name} {self.month}/{self.year}>"


class ServicePaymentRule(Base):
    """Payment benefit rules for services (discounts, cashback)."""
    __tablename__ = "service_payment_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    benefit_type = Column(String(20), nullable=False)  # ServiceBenefitType
    value = Column(Numeric(15, 2), nullable=False)
    
    # Relations
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("financial_products.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("service_id", "product_id", name="uq_payment_rule_service_product"),
    )

    # Relationships
    service = relationship("Service", back_populates="payment_rules")
    product = relationship("FinancialProduct", back_populates="payment_rules")

    def __repr__(self):
        return f"<ServicePaymentRule {self.benefit_type}>"


class ExchangeRate(Base):
    """Exchange rate between currencies."""
    __tablename__ = "exchange_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_currency = Column(String(10), nullable=False)  # Currency
    to_currency = Column(String(10), nullable=False)  # Currency
    rate = Column(Numeric(15, 6), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("from_currency", "to_currency", "timestamp", name="uq_exchange_rate_currencies_timestamp"),
    )

    def __repr__(self):
        return f"<ExchangeRate {self.from_currency}->{self.to_currency} {self.rate}>"
