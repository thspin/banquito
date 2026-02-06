"""Pydantic schemas for request/response validation and serialization."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============== Enums as Strings ==============

class TransactionType(str):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"


class InstitutionType(str):
    BANK = "BANK"
    WALLET = "WALLET"


class ProductType(str):
    CASH = "CASH"
    SAVINGS_ACCOUNT = "SAVINGS_ACCOUNT"
    CHECKING_ACCOUNT = "CHECKING_ACCOUNT"
    DEBIT_CARD = "DEBIT_CARD"
    CREDIT_CARD = "CREDIT_CARD"
    LOAN = "LOAN"


class Currency(str):
    ARS = "ARS"
    USD = "USD"
    USDT = "USDT"
    USDC = "USDC"
    BTC = "BTC"


class CategoryType(str):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class CardProvider(str):
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"
    AMEX = "AMEX"
    OTHER = "OTHER"


class SummaryStatus(str):
    DRAFT = "DRAFT"
    CLOSED = "CLOSED"
    PAID = "PAID"


class AdjustmentType(str):
    COMMISSION = "COMMISSION"
    TAX = "TAX"
    INTEREST = "INTEREST"
    INSURANCE = "INSURANCE"
    CREDIT = "CREDIT"
    OTHER = "OTHER"


class BillStatus(str):
    PENDING = "PENDING"
    PAID = "PAID"
    SKIPPED = "SKIPPED"


class ServiceBenefitType(str):
    DISCOUNT = "DISCOUNT"
    CASHBACK = "CASHBACK"


# ============== Base Schemas ==============

class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_encoders={
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        },
    )


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields."""
    created_at: datetime
    updated_at: Optional[datetime] = None


# ============== User Schemas ==============

class UserBase(BaseSchema):
    email: str
    name: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseSchema):
    name: Optional[str] = None


class UserResponse(UserBase, TimestampSchema):
    id: UUID


# ============== Category Schemas ==============

class CategoryBase(BaseSchema):
    name: str
    icon: Optional[str] = None
    category_type: str = CategoryType.EXPENSE
    is_system: bool = False


class CategoryCreate(CategoryBase):
    @field_validator('category_type')
    @classmethod
    def validate_category_type(cls, v):
        if v not in [CategoryType.INCOME, CategoryType.EXPENSE]:
            raise ValueError('category_type must be INCOME or EXPENSE')
        return v


class CategoryUpdate(BaseSchema):
    name: Optional[str] = None
    icon: Optional[str] = None


class CategoryResponse(CategoryBase, TimestampSchema):
    id: UUID
    user_id: UUID


# ============== Financial Institution Schemas ==============

class FinancialInstitutionBase(BaseSchema):
    name: str
    institution_type: str = InstitutionType.BANK
    share_summary: bool = False


class FinancialInstitutionCreate(FinancialInstitutionBase):
    @field_validator('institution_type')
    @classmethod
    def validate_institution_type(cls, v):
        if v not in [InstitutionType.BANK, InstitutionType.WALLET]:
            raise ValueError('institution_type must be BANK or WALLET')
        return v


class FinancialInstitutionUpdate(BaseSchema):
    name: Optional[str] = None
    share_summary: Optional[bool] = None


class FinancialInstitutionResponse(FinancialInstitutionBase, TimestampSchema):
    id: UUID
    user_id: UUID


# ============== Financial Product Schemas ==============

class FinancialProductBase(BaseSchema):
    name: str
    product_type: str
    currency: str = Currency.ARS
    balance: Decimal = Decimal("0.00")
    
    # Credit card specific
    closing_day: Optional[int] = Field(None, ge=1, le=31)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    limit_amount: Optional[Decimal] = None
    limit_single_payment: Optional[Decimal] = None
    limit_installments: Optional[Decimal] = None
    shared_limit: bool = False
    unified_limit: bool = False
    last_four_digits: Optional[str] = Field(None, max_length=4)
    expiration_date: Optional[datetime] = None
    provider: Optional[str] = None
    
    # Relations
    institution_id: Optional[UUID] = None
    linked_product_id: Optional[UUID] = None


class FinancialProductCreate(FinancialProductBase):
    @field_validator('product_type')
    @classmethod
    def validate_product_type(cls, v):
        valid_types = [
            ProductType.CASH,
            ProductType.SAVINGS_ACCOUNT,
            ProductType.CHECKING_ACCOUNT,
            ProductType.DEBIT_CARD,
            ProductType.CREDIT_CARD,
            ProductType.LOAN,
        ]
        if v not in valid_types:
            raise ValueError(f'product_type must be one of {valid_types}')
        return v
    
    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v):
        valid_currencies = [Currency.ARS, Currency.USD, Currency.USDT, Currency.USDC, Currency.BTC]
        if v not in valid_currencies:
            raise ValueError(f'currency must be one of {valid_currencies}')
        return v
    
    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v):
        if v is not None:
            valid_providers = [CardProvider.VISA, CardProvider.MASTERCARD, CardProvider.AMEX, CardProvider.OTHER]
            if v not in valid_providers:
                raise ValueError(f'provider must be one of {valid_providers}')
        return v


class FinancialProductUpdate(BaseSchema):
    name: Optional[str] = None
    closing_day: Optional[int] = Field(None, ge=1, le=31)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    limit_amount: Optional[Decimal] = None
    limit_single_payment: Optional[Decimal] = None
    limit_installments: Optional[Decimal] = None
    shared_limit: Optional[bool] = None
    unified_limit: Optional[bool] = None
    last_four_digits: Optional[str] = Field(None, max_length=4)
    expiration_date: Optional[datetime] = None
    provider: Optional[str] = None
    linked_product_id: Optional[UUID] = None


class FinancialProductResponse(FinancialProductBase, TimestampSchema):
    id: UUID
    user_id: UUID
    available_limit: Optional[Decimal] = None


class FinancialProductDetailResponse(FinancialProductResponse):
    institution: Optional[FinancialInstitutionResponse] = None
    linked_product: Optional[FinancialProductResponse] = None


# ============== Transaction Schemas ==============

class TransactionBase(BaseSchema):
    amount: Decimal = Field(..., gt=0)
    date: datetime
    description: str
    status: str = "COMPLETED"
    plan_z: bool = False
    transaction_type: str = TransactionType.EXPENSE
    
    # Installments
    installment_number: Optional[int] = None
    installment_total: Optional[int] = None
    
    # Relations
    category_id: Optional[UUID] = None
    from_product_id: Optional[UUID] = None
    to_product_id: Optional[UUID] = None


class TransactionCreate(BaseSchema):
    """Schema for creating a transaction."""
    amount: Decimal = Field(..., gt=0)
    date: datetime
    description: str
    transaction_type: str = TransactionType.EXPENSE
    category_id: Optional[UUID] = None
    from_product_id: UUID
    
    # For installments
    installments: int = Field(1, ge=1, le=48)
    plan_z: bool = False


class TransactionUpdate(BaseSchema):
    amount: Optional[Decimal] = Field(None, gt=0)
    date: Optional[datetime] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    plan_z: Optional[bool] = None


class TransactionResponse(TransactionBase, TimestampSchema):
    id: UUID
    user_id: UUID
    installment_id: Optional[UUID] = None


class TransactionDetailResponse(TransactionResponse):
    category: Optional[CategoryResponse] = None
    from_product: Optional[FinancialProductResponse] = None
    to_product: Optional[FinancialProductResponse] = None


class TransferCreate(BaseSchema):
    """Schema for creating a transfer."""
    amount: Decimal = Field(..., gt=0)
    date: datetime
    description: str
    from_product_id: UUID
    to_product_id: UUID


# ============== Credit Card Summary Schemas ==============

class SummaryItemBase(BaseSchema):
    amount: Decimal
    is_reconciled: bool = False
    has_discrepancy: bool = False
    note: Optional[str] = None


class SummaryItemResponse(SummaryItemBase):
    id: UUID
    summary_id: UUID
    transaction_id: UUID
    transaction: TransactionResponse


class SummaryAdjustmentBase(BaseSchema):
    adjustment_type: str
    description: str
    amount: Decimal


class SummaryAdjustmentCreate(SummaryAdjustmentBase):
    @field_validator('adjustment_type')
    @classmethod
    def validate_adjustment_type(cls, v):
        valid_types = [
            AdjustmentType.COMMISSION,
            AdjustmentType.TAX,
            AdjustmentType.INTEREST,
            AdjustmentType.INSURANCE,
            AdjustmentType.CREDIT,
            AdjustmentType.OTHER,
        ]
        if v not in valid_types:
            raise ValueError(f'adjustment_type must be one of {valid_types}')
        return v


class SummaryAdjustmentResponse(SummaryAdjustmentBase):
    id: UUID
    summary_id: UUID
    created_at: datetime


class CreditCardSummaryBase(BaseSchema):
    year: int
    month: int
    closing_date: datetime
    due_date: datetime
    total_amount: Decimal = Decimal("0.00")
    calculated_amount: Decimal = Decimal("0.00")
    adjustments_amount: Decimal = Decimal("0.00")
    is_closed: bool = False
    status: str = SummaryStatus.DRAFT
    paid_date: Optional[datetime] = None


class CreditCardSummaryCreate(BaseSchema):
    product_id: UUID
    year: int
    month: int


class CreditCardSummaryUpdate(BaseSchema):
    closing_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None


class CreditCardSummaryResponse(CreditCardSummaryBase, TimestampSchema):
    id: UUID
    product_id: UUID
    institution_id: Optional[UUID] = None
    user_id: UUID
    paid_from_product_id: Optional[UUID] = None


class CreditCardSummaryDetailResponse(CreditCardSummaryResponse):
    product: FinancialProductResponse
    institution: Optional[FinancialInstitutionResponse] = None
    items: List[SummaryItemResponse] = []
    adjustments: List[SummaryAdjustmentResponse] = []


class SummaryPayRequest(BaseSchema):
    from_product_id: UUID
    payment_date: Optional[datetime] = None


class SummaryProjectionResponse(BaseSchema):
    year: int
    month: int
    amount: Decimal
    transaction_count: int


# ============== Service Schemas ==============

class ServiceBase(BaseSchema):
    name: str
    default_amount: Optional[Decimal] = None
    default_due_day: Optional[int] = Field(None, ge=1, le=31)
    renewal_date: Optional[datetime] = None
    renewal_note: Optional[str] = None
    active: bool = True
    category_id: UUID


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseSchema):
    name: Optional[str] = None
    default_amount: Optional[Decimal] = None
    default_due_day: Optional[int] = Field(None, ge=1, le=31)
    renewal_date: Optional[datetime] = None
    renewal_note: Optional[str] = None
    active: Optional[bool] = None
    category_id: Optional[UUID] = None


class ServiceResponse(ServiceBase, TimestampSchema):
    id: UUID
    user_id: UUID
    category: Optional[CategoryResponse] = None


# ============== Service Bill Schemas ==============

class ServiceBillBase(BaseSchema):
    due_date: datetime
    amount: Decimal
    status: str = BillStatus.PENDING
    month: int
    year: int


class ServiceBillCreate(ServiceBillBase):
    service_id: UUID


class ServiceBillUpdate(BaseSchema):
    amount: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None


class ServiceBillResponse(ServiceBillBase, TimestampSchema):
    id: UUID
    service_id: UUID
    transaction_id: Optional[UUID] = None
    user_id: UUID
    service: Optional[ServiceResponse] = None


class ServiceBillPayRequest(BaseSchema):
    from_product_id: UUID
    amount: Optional[Decimal] = None


# ============== Service Payment Rule Schemas ==============

class ServicePaymentRuleBase(BaseSchema):
    benefit_type: str
    value: Decimal
    service_id: UUID
    product_id: UUID


class ServicePaymentRuleCreate(ServicePaymentRuleBase):
    @field_validator('benefit_type')
    @classmethod
    def validate_benefit_type(cls, v):
        if v not in [ServiceBenefitType.DISCOUNT, ServiceBenefitType.CASHBACK]:
            raise ValueError('benefit_type must be DISCOUNT or CASHBACK')
        return v


class ServicePaymentRuleResponse(ServicePaymentRuleBase, TimestampSchema):
    id: UUID


# ============== Exchange Rate Schemas ==============

class ExchangeRateBase(BaseSchema):
    from_currency: str
    to_currency: str
    rate: Decimal = Field(..., gt=0)


class ExchangeRateCreate(ExchangeRateBase):
    pass


class ExchangeRateResponse(ExchangeRateBase):
    id: UUID
    timestamp: datetime


# ============== Response Wrappers ==============

class SuccessResponse(BaseSchema):
    success: bool = True
    message: Optional[str] = None


class ErrorResponse(BaseSchema):
    success: bool = False
    error: str


class PaginatedResponse(BaseSchema):
    items: List
    total: int
    page: int
    page_size: int
    pages: int


# ============== Dashboard/Stats Schemas ==============

class AccountBalanceResponse(BaseSchema):
    product_id: UUID
    product_name: str
    product_type: str
    currency: str
    balance: Decimal
    available_limit: Optional[Decimal] = None


class InstitutionWithProductsResponse(FinancialInstitutionResponse):
    products: List[FinancialProductResponse] = []
