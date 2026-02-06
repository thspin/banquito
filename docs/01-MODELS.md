# Modelos de Base de Datos - banquito

## 📊 Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   USER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ id (PK) │ email │ name │ created_at                                          │
└────┬────────────────────────────────────────────────────────────────────────┘
     │
     │ 1:N
     ▼
┌──────────────┐  ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────┐
│   CATEGORY   │  │ FINANCIAL_INSTITUTION│  │     SERVICE     │  │ TRANSACTION │
├──────────────┤  ├─────────────────────┤  ├─────────────────┤  ├─────────────┤
│ id (PK)      │  │ id (PK)             │  │ id (PK)         │  │ id (PK)     │
│ name         │  │ name                │  │ name            │  │ amount      │
│ icon         │  │ institution_type    │  │ default_amount  │  │ date        │
│ category_type│  │ user_id (FK)        │  │ default_due_day │  │ description │
│ user_id (FK) │  └──────────┬──────────┘  │ category_id(FK) │  │ plan_z      │
└──────┬───────┘             │             │ user_id (FK)    │  │ from_prod(FK│
       │                     │             └────────┬────────┘  │ to_prod(FK) │
       │                     │                      │           │ user_id(FK) │
       │ 1:N                 │ 1:N                  │ 1:N       └──────┬──────┘
       ▼                     ▼                      │                │
┌──────────────┐  ┌─────────────────────┐           │                │ N:M
│   SERVICE    │  │  FINANCIAL_PRODUCT  │◄──────────┘                │
│ (reference)  │  ├─────────────────────┤                            │
└──────────────┘  │ id (PK)             │                            │
                  │ name                │                            │
                  │ product_type        │                            │
                  │ currency            │                            │
                  │ balance             │                            │
                  │ closing_day         │                            │
                  │ due_day             │                            │
                  │ limit_amount        │                            │
                  │ institution_id (FK) │                            │
                  │ user_id (FK)        │                            │
                  └──────────┬──────────┘                            │
                             │                                       │
                             │ 1:N                                   │
                             ▼                                       │
                  ┌─────────────────────┐                            │
                  │ CREDIT_CARD_SUMMARY │◄───────────────────────────┘
                  ├─────────────────────┤                            │
                  │ id (PK)             │                            │
                  │ year                │                            │
                  │ month               │                            │
                  │ closing_date        │                            │
                  │ due_date            │                            │
                  │ total_amount        │                            │
                  │ status              │                            │
                  │ product_id (FK)     │                            │
                  │ user_id (FK)        │                            │
                  └──────────┬──────────┘                            │
                             │                                       │
                             │ 1:N                                   │
                             ▼                                       │
                  ┌─────────────────────┐  ┌─────────────────────────┘
                  │    SUMMARY_ITEM     │  │
                  ├─────────────────────┤  │
                  │ id (PK)             │  │
                  │ amount              │  │
                  │ summary_id (FK)     │  │
                  │ transaction_id (FK) │◄─┘
                  └─────────────────────┘
```

## 🔤 Enums

### TransactionType
Tipo de transacción:
- `INCOME` - Ingreso de dinero
- `EXPENSE` - Gasto
- `TRANSFER` - Transferencia entre cuentas

### InstitutionType
Tipo de institución financiera:
- `BANK` - Banco tradicional
- `WALLET` - Billetera digital (Mercado Pago, etc.)

### ProductType
Tipo de producto financiero:
- `CASH` - Efectivo
- `SAVINGS_ACCOUNT` - Caja de ahorro
- `CHECKING_ACCOUNT` - Cuenta corriente
- `DEBIT_CARD` - Tarjeta de débito
- `CREDIT_CARD` - Tarjeta de crédito
- `LOAN` - Préstamo

### Currency
Monedas soportadas:
- `ARS` - Pesos argentinos
- `USD` - Dólares estadounidenses
- `USDT` - Tether
- `USDC` - USD Coin
- `BTC` - Bitcoin

### CategoryType
Tipo de categoría:
- `INCOME` - Para categorías de ingresos
- `EXPENSE` - Para categorías de gastos

### CardProvider
Proveedor de tarjeta:
- `VISA`
- `MASTERCARD`
- `AMEX`
- `OTHER`

### SummaryStatus
Estado del resumen de tarjeta:
- `DRAFT` - Borrador (se pueden agregar/quitar transacciones)
- `CLOSED` - Cerrado (listo para pagar)
- `PAID` - Pagado

### AdjustmentType
Tipo de ajuste en resumen:
- `COMMISSION` - Comisión
- `TAX` - Impuesto
- `INTEREST` - Interés
- `INSURANCE` - Seguro
- `CREDIT` - Crédito (negativo, descuento)
- `OTHER` - Otro

### BillStatus
Estado de boleta de servicio:
- `PENDING` - Pendiente de pago
- `PAID` - Pagada
- `SKIPPED` - Omitida (no se paga este mes)

### ServiceBenefitType
Tipo de beneficio al pagar servicio:
- `DISCOUNT` - Descuento
- `CASHBACK` - Reintegro/cashback

## 📋 Modelos Detallados

### User
**Tabla:** `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| email | String(255) | Email del usuario (único) |
| name | String(255) | Nombre opcional |
| created_at | DateTime | Fecha de creación |

**Relaciones:**
- `categories` → Category[] (1:N)
- `institutions` → FinancialInstitution[] (1:N)
- `products` → FinancialProduct[] (1:N)
- `services` → Service[] (1:N)
- `transactions` → Transaction[] (1:N)
- `summaries` → CreditCardSummary[] (1:N)

### Category
**Tabla:** `categories`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| name | String(255) | Nombre de la categoría |
| icon | String(100) | Icono (emoji o clase CSS) |
| category_type | String(20) | INCOME o EXPENSE |
| is_system | Boolean | Si es categoría del sistema |
| user_id | UUID (FK) | Usuario propietario |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Constraints:**
- Única por usuario y nombre

### FinancialInstitution
**Tabla:** `financial_institutions`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| name | String(255) | Nombre de la institución |
| institution_type | String(20) | BANK o WALLET |
| share_summary | Boolean | Si comparte resumen entre productos |
| user_id | UUID (FK) | Usuario propietario |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Constraints:**
- `uq_institution_user_name`: Única por usuario y nombre

### FinancialProduct
**Tabla:** `financial_products`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| name | String(255) | Nombre del producto |
| product_type | String(30) | Tipo de producto |
| currency | String(10) | Moneda (ARS, USD, etc.) |
| balance | Numeric(15,2) | Saldo actual |
| closing_day | Integer | Día de cierre (tarjetas) |
| due_day | Integer | Día de vencimiento (tarjetas) |
| limit_amount | Numeric(15,2) | Límite total de crédito |
| limit_single_payment | Numeric(15,2) | Límite en un pago |
| limit_installments | Numeric(15,2) | Límite en cuotas |
| shared_limit | Boolean | Límite compartido |
| unified_limit | Boolean | Límite unificado |
| last_four_digits | String(4) | Últimos 4 dígitos |
| expiration_date | DateTime | Vencimiento del plástico |
| provider | String(20) | VISA, MASTERCARD, etc. |
| institution_id | UUID (FK) | Institución |
| linked_product_id | UUID (FK) | Producto vinculado (débito→cuenta) |
| user_id | UUID (FK) | Usuario propietario |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Constraints:**
- `uq_product_institution_name_currency`: Única por institución, nombre, moneda y usuario

**Propiedades calculadas:**
- `available_limit`: Límite disponible (limit + balance para tarjetas de crédito)

### Transaction
**Tabla:** `transactions`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| amount | Numeric(15,2) | Monto |
| date | DateTime | Fecha de la transacción |
| description | String(500) | Descripción |
| status | String(50) | Estado (COMPLETED, etc.) |
| plan_z | Boolean | Si es Plan Z (3 cuotas sin interés) |
| transaction_type | String(20) | INCOME, EXPENSE, TRANSFER |
| installment_number | Integer | Número de cuota actual |
| installment_total | Integer | Total de cuotas |
| installment_id | UUID | ID del grupo de cuotas |
| category_id | UUID (FK) | Categoría |
| user_id | UUID (FK) | Usuario propietario |
| from_product_id | UUID (FK) | Producto origen |
| to_product_id | UUID (FK) | Producto destino (transferencias) |
| service_bill_id | UUID (FK) | Boleta de servicio asociada |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Indexes:**
- `ix_transactions_user_date`: (user_id, date) - para búsquedas por usuario y fecha
- `ix_transactions_installment`: installment_id - para agrupar cuotas

### CreditCardSummary
**Tabla:** `credit_card_summaries`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| year | Integer | Año del resumen |
| month | Integer | Mes del resumen (1-12) |
| closing_date | DateTime | Fecha de cierre |
| due_date | DateTime | Fecha de vencimiento |
| total_amount | Numeric(15,2) | Monto total a pagar |
| calculated_amount | Numeric(15,2) | Suma de transacciones |
| adjustments_amount | Numeric(15,2) | Suma de ajustes |
| is_closed | Boolean | Si está cerrado |
| status | String(20) | DRAFT, CLOSED, PAID |
| paid_date | DateTime | Fecha de pago |
| institution_id | UUID (FK) | Institución |
| product_id | UUID (FK) | Tarjeta de crédito |
| user_id | UUID (FK) | Usuario propietario |
| paid_from_product_id | UUID (FK) | Producto desde donde se pagó |
| payment_transaction_id | UUID (FK) | Transacción de pago |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Constraints:**
- `uq_summary_institution_product_year_month`: Única por institución, producto, año y mes

**Indexes:**
- `ix_summaries_user_product`: (user_id, product_id) - búsquedas por usuario y tarjeta

### SummaryItem
**Tabla:** `summary_items`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| amount | Numeric(15,2) | Monto en el resumen |
| is_reconciled | Boolean | Si fue conciliado con PDF |
| has_discrepancy | Boolean | Si hay discrepancia con PDF |
| note | Text | Nota opcional |
| summary_id | UUID (FK) | Resumen |
| transaction_id | UUID (FK) | Transacción |

**Constraints:**
- `uq_summary_item_summary_transaction`: Única por resumen y transacción

### SummaryAdjustment
**Tabla:** `summary_adjustments`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| adjustment_type | String(30) | Tipo de ajuste |
| description | String(500) | Descripción |
| amount | Numeric(15,2) | Monto (positivo o negativo) |
| summary_id | UUID (FK) | Resumen |
| created_at | DateTime | Fecha de creación |

### Service
**Tabla:** `services`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| name | String(255) | Nombre del servicio |
| default_amount | Numeric(15,2) | Monto por defecto |
| default_due_day | Integer | Día de vencimiento por defecto |
| renewal_date | DateTime | Fecha de renovación |
| renewal_note | Text | Nota sobre renovación |
| active | Boolean | Si está activo |
| category_id | UUID (FK) | Categoría |
| user_id | UUID (FK) | Usuario propietario |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

### ServiceBill
**Tabla:** `service_bills`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| due_date | DateTime | Fecha de vencimiento |
| amount | Numeric(15,2) | Monto a pagar |
| status | String(20) | PENDING, PAID, SKIPPED |
| month | Integer | Mes (1-12) |
| year | Integer | Año |
| service_id | UUID (FK) | Servicio |
| transaction_id | UUID (FK) | Transacción de pago |
| user_id | UUID (FK) | Usuario propietario |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Constraints:**
- `uq_service_bill_service_year_month`: Única por servicio, año y mes

### ServicePaymentRule
**Tabla:** `service_payment_rules`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| benefit_type | String(20) | DISCOUNT o CASHBACK |
| value | Numeric(15,2) | Valor del beneficio |
| service_id | UUID (FK) | Servicio |
| product_id | UUID (FK) | Producto (tarjeta con beneficio) |
| created_at | DateTime | Fecha de creación |
| updated_at | DateTime | Última actualización |

**Constraints:**
- `uq_payment_rule_service_product`: Única por servicio y producto

### ExchangeRate
**Tabla:** `exchange_rates`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| from_currency | String(10) | Moneda origen |
| to_currency | String(10) | Moneda destino |
| rate | Numeric(15,6) | Tipo de cambio |
| timestamp | DateTime | Fecha/hora del tipo de cambio |

**Constraints:**
- `uq_exchange_rate_currencies_timestamp`: Única por par de monedas y timestamp

**Indexes:**
- timestamp - para buscar el tipo de cambio más reciente

## 🔗 Relaciones Clave

### User - Todo
Cada usuario tiene sus propios:
- Categorías
- Instituciones
- Productos
- Servicios
- Transacciones
- Resúmenes

Todas las tablas tienen `user_id` y `ondelete="CASCADE"` para mantener aislamiento de datos.

### FinancialProduct - FinancialInstitution
Una institución tiene múltiples productos. Los productos pueden existir sin institución (ej: efectivo).

### FinancialProduct - Linked Product
Las tarjetas de débito se vinculan a una cuenta (linked_product_id) para validar saldo.

### Transaction - Products
- `from_product`: Producto origen del gasto
- `to_product`: Producto destino (para transferencias o ingresos)

### Transaction - Installments
Las compras en cuotas comparten el mismo `installment_id`.
- `installment_number`: 1, 2, 3, ...
- `installment_total`: 3, 6, 12, ...

### CreditCardSummary - Transactions
Un resumen tiene múltiples `SummaryItem`, cada uno vinculado a una transacción.

### Service - ServiceBill
Un servicio genera una boleta por mes/año automáticamente.

### ServiceBill - Transaction
Al pagar una boleta se crea una transacción vinculada.

## 🔄 Migraciones con Alembic

### Crear nueva migración
```bash
cd backend
alembic revision --autogenerate -m "descripcion del cambio"
```

### Aplicar migraciones
```bash
alembic upgrade head
```

### Revertir última migración
```bash
alembic downgrade -1
```

### Resetear base de datos
```bash
alembic downgrade base
alembic upgrade head
```

### Ver historial
```bash
alembic history --verbose
```

## 📝 Notas de Implementación

### Campos Numeric
Todos los montos usan `Numeric(15, 2)` para precisión decimal:
- 15 dígitos totales
- 2 decimales
- Evita problemas de punto flotante

### Timezones
- Todos los campos `DateTime` usan `timezone=True`
- Se almacenan en UTC
- La aplicación debe convertir a hora local (America/Argentina/Buenos_Aires)

### Soft Delete
No hay soft delete implementado. Las eliminaciones son permanentes con `CASCADE`.

### Índices
Se crearon índices estratégicos en:
- Búsquedas por usuario y fecha (transacciones)
- Búsquedas por grupo de cuotas
- Búsquedas por usuario y tarjeta (resúmenes)
- Tipos de cambio por timestamp

## 🚀 Próximos Pasos

1. Ver [02-ACCOUNTS-API.md](02-ACCOUNTS-API.md) para la API de cuentas
2. Crear schemas Pydantic para validación
3. Implementar endpoints CRUD
