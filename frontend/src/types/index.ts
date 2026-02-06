// Enums
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type InstitutionType = 'BANK' | 'WALLET';
export type ProductType = 'CASH' | 'SAVINGS_ACCOUNT' | 'CHECKING_ACCOUNT' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'LOAN';
export type Currency = 'ARS' | 'USD' | 'USDT' | 'USDC' | 'BTC';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type CardProvider = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER';
export type SummaryStatus = 'DRAFT' | 'CLOSED' | 'PAID';
export type AdjustmentType = 'COMMISSION' | 'TAX' | 'INTEREST' | 'INSURANCE' | 'CREDIT' | 'OTHER';
export type BillStatus = 'PENDING' | 'PAID' | 'SKIPPED';

// Base interfaces
export interface Timestamped {
  id: string;
  created_at: string;
  updated_at?: string;
}

// User
export interface User extends Timestamped {
  email: string;
  name?: string;
}

// Category
export interface Category extends Timestamped {
  name: string;
  icon?: string;
  category_type: CategoryType;
  is_system: boolean;
  user_id: string;
}

export interface CategoryCreate {
  name: string;
  icon?: string;
  category_type: CategoryType;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
}

// Institution
export interface FinancialInstitution extends Timestamped {
  name: string;
  institution_type: InstitutionType;
  share_summary: boolean;
  user_id: string;
}

export interface FinancialInstitutionCreate {
  name: string;
  institution_type: InstitutionType;
  share_summary?: boolean;
}

export interface FinancialInstitutionUpdate {
  name?: string;
  share_summary?: boolean;
}

// Product
export interface FinancialProduct extends Timestamped {
  name: string;
  product_type: ProductType;
  currency: Currency;
  balance: number;
  closing_day?: number;
  due_day?: number;
  limit_amount?: number;
  limit_single_payment?: number;
  limit_installments?: number;
  shared_limit: boolean;
  unified_limit: boolean;
  last_four_digits?: string;
  expiration_date?: string;
  provider?: CardProvider;
  institution_id?: string;
  linked_product_id?: string;
  user_id: string;
  available_limit?: number;
}

export interface FinancialProductCreate {
  name: string;
  product_type: ProductType;
  currency?: Currency;
  balance?: number;
  closing_day?: number;
  due_day?: number;
  limit_amount?: number;
  limit_single_payment?: number;
  limit_installments?: number;
  shared_limit?: boolean;
  unified_limit?: boolean;
  last_four_digits?: string;
  expiration_date?: string;
  provider?: CardProvider;
  institution_id?: string;
  linked_product_id?: string;
}

export interface FinancialProductUpdate {
  name?: string;
  closing_day?: number;
  due_day?: number;
  limit_amount?: number;
  limit_single_payment?: number;
  limit_installments?: number;
  shared_limit?: boolean;
  unified_limit?: boolean;
  last_four_digits?: string;
  expiration_date?: string;
  provider?: CardProvider;
  linked_product_id?: string;
}

// Transaction
export interface Transaction extends Timestamped {
  amount: number;
  date: string;
  description: string;
  status: string;
  plan_z: boolean;
  transaction_type: TransactionType;
  installment_number?: number;
  installment_total?: number;
  installment_id?: string;
  category_id?: string;
  user_id: string;
  from_product_id?: string;
  to_product_id?: string;
}

export interface TransactionDetail extends Transaction {
  category?: Category;
  from_product?: FinancialProduct;
  to_product?: FinancialProduct;
}

export interface TransactionCreate {
  amount: number;
  date: string;
  description: string;
  transaction_type: TransactionType;
  category_id?: string;
  from_product_id: string;
  installments?: number;
  plan_z?: boolean;
}

export interface TransactionUpdate {
  amount?: number;
  date?: string;
  description?: string;
  category_id?: string;
  plan_z?: boolean;
}

export interface TransferCreate {
  amount: number;
  date: string;
  description: string;
  from_product_id: string;
  to_product_id: string;
}

// Summary
export interface CreditCardSummary extends Timestamped {
  year: number;
  month: number;
  closing_date: string;
  due_date: string;
  total_amount: number;
  calculated_amount: number;
  adjustments_amount: number;
  is_closed: boolean;
  status: SummaryStatus;
  paid_date?: string;
  product_id: string;
  institution_id?: string;
  user_id: string;
  paid_from_product_id?: string;
}

export interface SummaryItem {
  id: string;
  amount: number;
  is_reconciled: boolean;
  has_discrepancy: boolean;
  note?: string;
  summary_id: string;
  transaction_id: string;
  transaction: Transaction;
}

export interface SummaryAdjustment {
  id: string;
  adjustment_type: AdjustmentType;
  description: string;
  amount: number;
  summary_id: string;
  created_at: string;
}

export interface CreditCardSummaryDetail extends CreditCardSummary {
  product: FinancialProduct;
  institution?: FinancialInstitution;
  items: SummaryItem[];
  adjustments: SummaryAdjustment[];
}

export interface SummaryAdjustmentCreate {
  adjustment_type: AdjustmentType;
  description: string;
  amount: number;
}

export interface SummaryPayRequest {
  from_product_id: string;
  payment_date?: string;
}

export interface SummaryProjection {
  year: number;
  month: number;
  amount: number;
  transaction_count: number;
}

// Service
export interface Service extends Timestamped {
  name: string;
  default_amount?: number;
  default_due_day?: number;
  renewal_date?: string;
  renewal_note?: string;
  active: boolean;
  category_id: string;
  user_id: string;
  category?: Category;
}

export interface ServiceCreate {
  name: string;
  default_amount?: number;
  default_due_day?: number;
  renewal_date?: string;
  renewal_note?: string;
  active?: boolean;
  category_id: string;
}

export interface ServiceUpdate {
  name?: string;
  default_amount?: number;
  default_due_day?: number;
  renewal_date?: string;
  renewal_note?: string;
  active?: boolean;
  category_id?: string;
}

// Service Bill
export interface ServiceBill extends Timestamped {
  due_date: string;
  amount: number;
  status: BillStatus;
  month: number;
  year: number;
  service_id: string;
  transaction_id?: string;
  user_id: string;
  service?: Service;
}

export interface ServiceBillCreate {
  due_date: string;
  amount: number;
  status?: BillStatus;
  month: number;
  year: number;
  service_id: string;
}

export interface ServiceBillUpdate {
  amount?: number;
  due_date?: string;
  status?: BillStatus;
}

export interface ServiceBillPayRequest {
  from_product_id: string;
  amount?: number;
}

// Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
