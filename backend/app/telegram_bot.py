"""
Banquito Telegram Bot (v2)
Conversational flow for registering expenses and income.

Flow:
  1. User sends amount (number)
  2. Bot asks for description
  3. Bot asks: expense or income? (inline keyboard)
  4. Bot asks: which account? (inline keyboard)
  5. Bot asks: which category? (inline keyboard)
  6. Bot asks: date is today? confirm or change (inline keyboard)
  7. Transaction is created
"""

import logging
from uuid import UUID
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from aiogram import Bot, Dispatcher, types, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder, InlineKeyboardButton
from aiogram.types import CallbackQuery

from app.config import settings
from app.database import AsyncSessionLocal
from app.services.transaction_service import TransactionService
from app.services.account_service import AccountService
from app.schemas import TransactionCreate, TransferCreate
from app.models import (
    TransactionType,
    Category,
    CategoryType,
    FinancialProduct,
    FinancialInstitution,
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bot & Dispatcher (use NeonStorage for Vercel compatibility)
# ---------------------------------------------------------------------------
from app.telegram_storage import NeonStorage
from aiogram.fsm.storage.memory import MemoryStorage

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN) if settings.TELEGRAM_BOT_TOKEN else None

# Storage: NeonStorage in production (webhook/Vercel), MemoryStorage for local dev
# NeonStorage persists FSM state in PostgreSQL across serverless invocations.
# MemoryStorage is faster but lost on process restart — fine for local polling.
if settings.APP_ENV == "production":
    _storage = NeonStorage()
    logger.info("Telegram FSM: using NeonStorage (production)")
else:
    _storage = MemoryStorage()
    logger.info("Telegram FSM: using MemoryStorage (development)")

dp = Dispatcher(storage=_storage)

router = Router()
dp.include_router(router)


# ---------------------------------------------------------------------------
# FSM States
# ---------------------------------------------------------------------------
class TxFlow(StatesGroup):
    waiting_description = State()    # Step 2: description
    waiting_type = State()           # Step 3: expense or income
    waiting_account_type = State()   # Step 4a: account type (origin)
    waiting_account = State()        # Step 4b: specific account (origin)
    waiting_account_type_to = State()# Step 4c: account type (destination - transfers only)
    waiting_account_to = State()     # Step 4d: specific account (destination - transfers only)
    waiting_category = State()       # Step 5: category
    waiting_date_confirm = State()   # Step 6a: confirm today
    waiting_date_input = State()     # Step 6b: custom dd/mm


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
EMOJI_MAP = {
    "EXPENSE": "💸",
    "INCOME": "💰",
    "TRANSFER": "🔄",
}

PRODUCT_TYPE_EMOJI = {
    "CASH": "💵",
    "SAVINGS_ACCOUNT": "🏦",
    "CHECKING_ACCOUNT": "🏦",
    "DEBIT_CARD": "💳",
    "CREDIT_CARD": "💳",
    "LOAN": "📋",
}


async def _get_user_id() -> UUID:
    """Get the current user ID (hardcoded demo user)."""
    return UUID(settings.CURRENT_USER_ID)


async def _get_accounts(user_id: UUID) -> list:
    """Fetch the user's financial products with institution info."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FinancialProduct)
            .where(FinancialProduct.user_id == user_id)
            .options(selectinload(FinancialProduct.institution))
            .order_by(FinancialProduct.name)
        )
        return list(result.scalars().all())


def _account_label(acc) -> str:
    """Build a readable label for an account button."""
    emoji = PRODUCT_TYPE_EMOJI.get(acc.product_type, "📦")
    
    # Institution name (bank)
    inst_name = ""
    if acc.institution:
        inst_name = acc.institution.name + " · "
    
    # Last 4 digits for cards
    digits = ""
    if acc.last_four_digits:
        digits = f" ···{acc.last_four_digits}"
    
    return f"{emoji} {inst_name}{acc.name}{digits} ({acc.currency})"


async def _get_categories(user_id: UUID, category_type: str) -> list:
    """Fetch user categories filtered by type."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Category)
            .where(Category.user_id == user_id)
            .where(Category.category_type == category_type)
            .order_by(Category.name)
        )
        return list(result.scalars().all())


def _format_transactions(transactions) -> str:
    """Format a list of transactions for display."""
    text = "📋 *Últimas transacciones:*\n\n"
    for tx in transactions:
        emoji = EMOJI_MAP.get(tx.transaction_type, "📝")
        date_str = tx.date.strftime("%d/%m") if tx.date else "?"
        if tx.transaction_type == "EXPENSE":
            amount_str = f"-${tx.amount:,.2f}"
        else:
            amount_str = f"+${tx.amount:,.2f}"
        text += f"{emoji} {date_str}  {amount_str}  {tx.description}\n"
    return text


def _parse_amount(text: str) -> Optional[Decimal]:
    """Try to parse a number from text. Returns Decimal or None."""
    cleaned = text.strip().replace("$", "").replace(",", ".")
    try:
        amount = Decimal(cleaned)
        return amount if amount > 0 else None
    except (InvalidOperation, ValueError):
        return None


def _today_str() -> str:
    return datetime.now().strftime("%d/%m/%Y")


def _type_label(tx_type: str) -> str:
    if tx_type == "TRANSFER": return "Transferencia"
    return "Gasto" if tx_type == "EXPENSE" else "Ingreso"


async def _send_main_menu(message: types.Message, text: str = ""):
    """Send main menu with action buttons."""
    if not text:
        text = "📋 *Banquito* — ¿Qué querés hacer?"

    kb = InlineKeyboardBuilder()
    kb.button(text="📝 Nuevo registro", callback_data="action:new")
    kb.button(text="📊 Ver resumen", callback_data="action:resumen")
    kb.button(text="📋 Últimos movimientos", callback_data="action:ultimos")
    kb.adjust(1)

    await message.answer(text, reply_markup=kb.as_markup(), parse_mode="Markdown")


def _format_balances(accounts) -> str:
    """Format account balances grouped by type."""
    type_labels = {
        "CASH": "💵 Efectivo",
        "SAVINGS_ACCOUNT": "🏦 Cajas de Ahorro",
        "CHECKING_ACCOUNT": "🏦 Cuentas Corrientes",
        "DEBIT_CARD": "💳 Tarjetas Débito",
        "CREDIT_CARD": "💳 Tarjetas Crédito",
        "LOAN": "📋 Préstamos",
    }
    type_order = ["CASH", "SAVINGS_ACCOUNT", "CHECKING_ACCOUNT", "DEBIT_CARD", "CREDIT_CARD", "LOAN"]

    grouped = {}
    for acc in accounts:
        grouped.setdefault(acc.product_type, []).append(acc)

    text = "💰 *Tus Saldos:*\n\n"
    for ptype in type_order:
        accs = grouped.get(ptype, [])
        if not accs:
            continue
        header = type_labels.get(ptype, ptype)
        text += f"*{header}*\n"
        for acc in accs:
            inst = f"{acc.institution.name} · " if acc.institution else ""
            digits = f" ···{acc.last_four_digits}" if acc.last_four_digits else ""
            text += f"  {inst}{acc.name}{digits}\n"
            text += f"  *${acc.balance:,.2f}* {acc.currency}\n"
        text += "\n"
    return text


# ---------------------------------------------------------------------------
# /start
# ---------------------------------------------------------------------------
@router.message(CommandStart())
async def cmd_start(message: types.Message, state: FSMContext):
    """Welcome message with action buttons."""
    await state.clear()
    await _send_main_menu(message, "👋 *¡Hola! Soy el bot de Banquito.*\n\nEnviame un monto para registrar un movimiento.")


# ---------------------------------------------------------------------------
# /ayuda
# ---------------------------------------------------------------------------
@router.message(Command("ayuda"))
async def cmd_ayuda(message: types.Message):
    """Help command."""
    await message.answer(
        "📖 *Guía de Banquito Bot*\n\n"
        "1️⃣ Enviá el *monto* (ej: `1500`)\n"
        "2️⃣ Escribí la *descripción*\n"
        "3️⃣ Elegí *gasto* o *ingreso*\n"
        "4️⃣ Seleccioná la *cuenta*\n"
        "5️⃣ Seleccioná la *categoría*\n"
        "6️⃣ Confirmá la *fecha*\n\n"
        "✅ ¡Listo! Transacción registrada.\n\n"
        "📋 *Comandos:*\n"
        "/resumen — Saldos\n"
        "/ultimos — Últimas 5 transacciones\n"
        "/cancelar — Cancelar operación\n"
        "/ayuda — Esta ayuda",
        parse_mode="Markdown",
    )


# ---------------------------------------------------------------------------
# /cancelar
# ---------------------------------------------------------------------------
@router.message(Command("cancelar"))
async def cmd_cancelar(message: types.Message, state: FSMContext):
    """Cancel ongoing flow and show main menu."""
    current = await state.get_state()
    await state.clear()
    if current:
        await message.answer("❌ Operación cancelada.")
    await _send_main_menu(message)


# ---------------------------------------------------------------------------
# /resumen
# ---------------------------------------------------------------------------
@router.message(Command("resumen"))
async def cmd_resumen(message: types.Message):
    """Show account balances."""
    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)

    if not accounts:
        await message.answer("No tenés cuentas registradas. Crealas desde la web.")
        return

    text = _format_balances(accounts)

    kb = InlineKeyboardBuilder()
    kb.button(text="📝 Nuevo registro", callback_data="action:new")
    kb.button(text="📋 Últimos movimientos", callback_data="action:ultimos")
    kb.adjust(2)

    await message.answer(text, reply_markup=kb.as_markup(), parse_mode="Markdown")


# ---------------------------------------------------------------------------
# /ultimos
# ---------------------------------------------------------------------------
@router.message(Command("ultimos"))
async def cmd_ultimos(message: types.Message):
    """Show last 5 transactions."""
    user_id = await _get_user_id()

    async with AsyncSessionLocal() as db:
        service = TransactionService(db)
        transactions = await service.get_transactions(user_id=user_id, limit=5)

    if not transactions:
        await message.answer("No tenés transacciones todavía.")
        return

    text = _format_transactions(transactions)
    await message.answer(text, parse_mode="Markdown")


# ===========================================================================
# TRANSACTION FLOW
# ===========================================================================

# ---------------------------------------------------------------------------
# Step 2 (text): Description received → ask type
# IMPORTANT: State-filtered handlers MUST be registered BEFORE the catch-all
# ---------------------------------------------------------------------------
@router.message(TxFlow.waiting_description, F.text)
async def on_description(message: types.Message, state: FSMContext):
    """Process description and ask for type."""
    description = message.text.strip()
    if not description:
        await message.answer("Escribí una descripción para el movimiento.")
        return
    await state.update_data(description=description)
    await _ask_type(message, state)


# ---------------------------------------------------------------------------
# Step 6b (text): Custom date input
# ---------------------------------------------------------------------------
@router.message(TxFlow.waiting_date_input, F.text)
async def on_date_text(message: types.Message, state: FSMContext):
    """Process custom date dd/mm or dd/mm/yyyy."""
    text = message.text.strip()
    try:
        parts = text.split("/")
        day = int(parts[0])
        month = int(parts[1])
        year = int(parts[2]) if len(parts) > 2 else datetime.now().year
        chosen = datetime(year, month, day)
        await state.update_data(date=chosen.isoformat())
        await message.answer(f"✅ Fecha: {chosen.strftime('%d/%m/%Y')}")
        await _create_transaction(message, state)
    except (ValueError, IndexError):
        await message.answer(
            "❌ Fecha inválida. Usá *dd/mm*\nEjemplo: `15/03`",
            parse_mode="Markdown",
        )


# ---------------------------------------------------------------------------
# Step 1 (text): Catch-all for amount (no active state)
# This MUST be registered AFTER the state-filtered handlers above
# ---------------------------------------------------------------------------
@router.message(F.text & ~F.text.startswith("/"))
async def handle_amount_input(message: types.Message, state: FSMContext):
    """Handle free text as amount input to start a new flow."""
    amount = _parse_amount(message.text)
    if amount is None:
        await message.answer(
            "Enviame un *monto* para empezar.\n"
            "Ejemplo: `1500`\n\n"
            "O usá /ayuda para ver los comandos.",
            parse_mode="Markdown",
        )
        return

    # Save amount, ask for description
    await state.update_data(amount=str(amount))
    
    kb = InlineKeyboardBuilder()
    kb.button(text="⬅️ Cambiar monto", callback_data="back_to_start")
    
    await message.answer(
        f"💲 Monto: *${amount:,.2f}*\n\n"
        "📝 ¿Cuál es la descripción?",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_description)


# ---------------------------------------------------------------------------
# Step 2 helper: Ask type
# ---------------------------------------------------------------------------
async def _ask_type(message: types.Message, state: FSMContext):
    """Show type selection keyboard."""
    data = await state.get_data()
    amount = Decimal(data["amount"])
    description = data.get("description", "")

    kb = InlineKeyboardBuilder()
    kb.button(text="💸 Gasto", callback_data="type:EXPENSE")
    kb.button(text="💰 Ingreso", callback_data="type:INCOME")
    kb.button(text="🔄 Transf", callback_data="type:TRANSFER")
    kb.adjust(3)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    await message.answer(
        f"💲 *${amount:,.2f}* — _{description}_\n\n"
        "¿Es un gasto o un ingreso?",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_type)


# ---------------------------------------------------------------------------
# Step 3: Type selected → ask account
# ---------------------------------------------------------------------------
@router.callback_query(TxFlow.waiting_type, F.data.startswith("type:"))
async def on_type_selected(callback: CallbackQuery, state: FSMContext):
    """User chose expense or income. Now ask for account type."""
    tx_type = callback.data.split(":")[1]
    await state.update_data(transaction_type=tx_type)
    await callback.answer()
    await _ask_account_type(callback.message, state)


async def _ask_account_type(message: types.Message, state: FSMContext):
    """Show account type selection."""
    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)
    data = await state.get_data()
    tx_type = data["transaction_type"]

    if not accounts:
        await message.edit_text(
            "❌ No tenés cuentas configuradas. Creá una desde la web.",
        )
        await state.clear()
        return

    # Build account TYPE keyboard (few buttons)
    TYPE_LABELS = {
        "CASH": "💵 Efectivo",
        "SAVINGS_ACCOUNT": "🏦 Cajas de Ahorro",
        "CHECKING_ACCOUNT": "🏦 Ctas. Corrientes",
        "DEBIT_CARD": "💳 Tarjetas Débito",
        "CREDIT_CARD": "💳 Tarjetas Crédito",
        "LOAN": "📋 Préstamos",
    }
    if tx_type == "TRANSFER":
        type_order = ["SAVINGS_ACCOUNT", "CHECKING_ACCOUNT", "CREDIT_CARD"]
    else:
        type_order = ["CASH", "SAVINGS_ACCOUNT", "CHECKING_ACCOUNT", "DEBIT_CARD", "CREDIT_CARD", "LOAN"]

    # Group accounts by type
    grouped = {}
    for acc in accounts:
        grouped.setdefault(acc.product_type, []).append(acc)

    # Filter: for expenses and transfers, hide types that make no sense
    if tx_type in ["EXPENSE", "TRANSFER"]:
        grouped.pop("LOAN", None)  # Can't spend from a loan

    # If only one type exists, skip type selection
    if len(grouped) == 1:
        ptype = list(grouped.keys())[0]
        accs = grouped[ptype]
        if len(accs) == 1:
            # Only 1 account total — auto-select
            await state.update_data(account_id=str(accs[0].id))
            type_label_full = _type_label(tx_type)
            inst = f"{accs[0].institution.name} · " if accs[0].institution else ""
            await message.edit_text(
                message.text + f"\n\n✅ {type_label_full}\n✅ Cuenta: {inst}{accs[0].name}",
                parse_mode="Markdown",
            )
            if tx_type == "TRANSFER":
                await _ask_account_type_to(message, state)
            else:
                await _ask_category(message, state)
            return

    # Show type buttons
    kb = InlineKeyboardBuilder()
    for ptype in type_order:
        accs = grouped.get(ptype, [])
        if not accs:
            continue
        label = TYPE_LABELS.get(ptype, ptype)
        count = len(accs)
        kb.button(text=f"{label} ({count})", callback_data=f"acctype:{ptype}")
    kb.adjust(1)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    type_label = _type_label(tx_type)
    
    # Strip any text added from previous forward passes
    lines = message.text.split("\n")
    base = "\n".join(l for l in lines if "¿Qué tipo de cuenta?" not in l).rstrip()
    
    # Add our current text
    title_text = "🏦 ¿Qué tipo de cuenta? (Origen)" if tx_type == "TRANSFER" else "🏦 ¿Qué tipo de cuenta?"
    await message.edit_text(
        base + f"\n\n✅ {type_label}\n\n" + title_text,
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_account_type)


# ---------------------------------------------------------------------------
# Step 4a: Account type selected → show accounts of that type
# ---------------------------------------------------------------------------
@router.callback_query(TxFlow.waiting_account_type, F.data.startswith("acctype:"))
async def on_account_type_selected(callback: CallbackQuery, state: FSMContext):
    """User chose an account type. Show specific accounts."""
    ptype = callback.data.split(":")[1]
    await state.update_data(account_type=ptype)
    await callback.answer()

    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)
    data = await state.get_data()
    tx_type = data["transaction_type"]
    amount = Decimal(data["amount"])

    filtered = [a for a in accounts if a.product_type == ptype]

    # For expenses and transfers, filter out accounts with insufficient balance
    if tx_type in ["EXPENSE", "TRANSFER"]:
        filtered = [a for a in filtered if a.balance >= amount]
        if not filtered:
            await callback.message.answer(
                "❌ Ninguna cuenta de este tipo tiene saldo suficiente.\n"
                f"Monto requerido: ${amount:,.2f}",
                parse_mode="Markdown",
            )
            return  # Stay in waiting_account_type, user picks another type

    if len(filtered) == 1:
        # Only 1 account of this type — auto-select
        acc = filtered[0]
        await state.update_data(account_id=str(acc.id))
        inst = f"{acc.institution.name} · " if acc.institution else ""
        lines = callback.message.text.split("\n")
        base = "\n".join(l for l in lines if "tipo de cuenta?" not in l.lower()).rstrip()
        await callback.message.edit_text(
            base + f"\n✅ Cuenta: {inst}{acc.name}",
            parse_mode="Markdown",
        )
        if tx_type == "TRANSFER":
            await _ask_account_type_to(callback.message, state)
        else:
            await _ask_category(callback.message, state)
        return

    # Show specific accounts
    kb = InlineKeyboardBuilder()
    for acc in filtered:
        inst = f"{acc.institution.name} · " if acc.institution else ""
        digits = f" ···{acc.last_four_digits}" if acc.last_four_digits else ""
        balance_str = f" (${acc.balance:,.0f})"
        label = f"{inst}{acc.name}{digits}{balance_str}"
        kb.button(text=label, callback_data=f"acc:{acc.id}")
    kb.adjust(1)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    lines = callback.message.text.split("\n")
    base = "\n".join(l for l in lines if "tipo de cuenta?" not in l.lower()).rstrip()
    title_text = "🏦 ¿Cuál cuenta? (Origen)" if tx_type == "TRANSFER" else "🏦 ¿Cuál cuenta?"
    await callback.message.edit_text(
        base + f"\n\n{title_text}",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_account)


async def _ask_specific_account(message: types.Message, state: FSMContext):
    """Show specific accounts for the chosen account type."""
    data = await state.get_data()
    ptype = data.get("account_type")
    tx_type = data.get("transaction_type")
    amount = Decimal(data.get("amount", "0"))

    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)
    filtered = [a for a in accounts if a.product_type == ptype]

    if tx_type in ["EXPENSE", "TRANSFER"]:
        filtered = [a for a in filtered if a.balance >= amount]

    # Show specific accounts
    kb = InlineKeyboardBuilder()
    for acc in filtered:
        inst = f"{acc.institution.name} · " if acc.institution else ""
        digits = f" ···{acc.last_four_digits}" if acc.last_four_digits else ""
        balance_str = f" (${acc.balance:,.0f})"
        label = f"{inst}{acc.name}{digits}{balance_str}"
        kb.button(text=label, callback_data=f"acc:{acc.id}")
    kb.adjust(1)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    # Cleanup text
    lines = message.text.split("\n")
    base = "\n".join(l for l in lines if "¿Cuál cuenta?" not in l and "tipo de cuenta" not in l and not l.startswith("✅ Cuenta")).rstrip()
    
    title_text = "🏦 ¿Cuál cuenta? (Origen)" if tx_type == "TRANSFER" else "🏦 ¿Cuál cuenta?"
    await message.edit_text(
        base + f"\n\n{title_text}",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_account)


# ---------------------------------------------------------------------------
# Step 4b: Account selected → ask category
# ---------------------------------------------------------------------------
@router.callback_query(TxFlow.waiting_account, F.data.startswith("acc:"))
async def on_account_selected(callback: CallbackQuery, state: FSMContext):
    """User chose an account. Now ask for category."""
    account_id = callback.data.split(":")[1]
    await callback.answer()

    # Get account for display and validation
    user_id = await _get_user_id()
    async with AsyncSessionLocal() as db:
        acc_service = AccountService(db)
        acc = await acc_service.get_product(UUID(account_id), user_id)

    if not acc:
        await callback.message.answer("❌ Cuenta no encontrada.")
        await state.clear()
        return

    # Balance validation for expenses
    data = await state.get_data()
    tx_type = data["transaction_type"]
    amount = Decimal(data["amount"])

    if tx_type in ["EXPENSE", "TRANSFER"] and acc.balance < amount:
        await callback.message.answer(
            f"❌ *Saldo insuficiente*\n\n"
            f"Monto: ${amount:,.2f}\n"
            f"Saldo disponible: ${acc.balance:,.2f}\n\n"
            f"Elegí otra cuenta.",
            parse_mode="Markdown",
        )
        return  # Stay in waiting_account state, user can pick another

    await state.update_data(account_id=account_id)
    inst = f"{acc.institution.name} · " if acc.institution else ""
    acc_name = f"{inst}{acc.name}"

    lines = callback.message.text.split("\n")
    base = "\n".join(l for l in lines if "cuenta?" not in l.lower()).rstrip()
    await callback.message.edit_text(
        base + f"\n✅ Cuenta: {acc_name}",
        parse_mode="Markdown",
    )

    if tx_type == "TRANSFER":
        await _ask_account_type_to(callback.message, state)
    else:
        await _ask_category(callback.message, state)

# ---------------------------------------------------------------------------
# Step 4c: Account type selected (Destination for Transfer) -> ask specific
# ---------------------------------------------------------------------------
async def _ask_account_type_to(message: types.Message, state: FSMContext):
    """Show account type selection for the destination of a transfer."""
    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)
    data = await state.get_data()
    from_account_id = data.get("account_id")

    if not accounts:
        await state.clear()
        return

    TYPE_LABELS = {
        "CASH": "💵 Efectivo",
        "SAVINGS_ACCOUNT": "🏦 Cajas de Ahorro",
        "CHECKING_ACCOUNT": "🏦 Ctas. Corrientes",
        "DEBIT_CARD": "💳 Tarjetas Débito",
        "CREDIT_CARD": "💳 Tarjetas Crédito",
        "LOAN": "📋 Préstamos",
    }
    type_order = ["SAVINGS_ACCOUNT", "CHECKING_ACCOUNT"]

    grouped = {}
    for acc in accounts:
        if str(acc.id) == from_account_id:
            continue # skip the source account
        grouped.setdefault(acc.product_type, []).append(acc)

    # Filter out types we can't receive transfers to (like Loan could be valid to pay it off, let's keep it simple)
    # If only one type exists, skip type selection
    if len(grouped) == 1:
        ptype = list(grouped.keys())[0]
        accs = grouped[ptype]
        if len(accs) == 1:
            # Only 1 account total — auto-select
            await state.update_data(account_to_id=str(accs[0].id))
            inst = f"{accs[0].institution.name} · " if accs[0].institution else ""
            await message.edit_text(
                message.text + f"\n✅ Destino: {inst}{accs[0].name}",
                parse_mode="Markdown",
            )
            await _ask_date(message, state)
            return

    # Show type buttons
    kb = InlineKeyboardBuilder()
    for ptype in type_order:
        accs = grouped.get(ptype, [])
        if not accs:
            continue
        label = TYPE_LABELS.get(ptype, ptype)
        count = len(accs)
        kb.button(text=f"{label} ({count})", callback_data=f"acctypeto:{ptype}")
    kb.adjust(1)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    lines = message.text.split("\n")
    base = "\n".join(l for l in lines if "¿Qué tipo de cuenta? (Origen)" not in l and "¿Qué tipo de cuenta? (Destino)" not in l and "¿Cuál cuenta?" not in l).rstrip()

    await message.edit_text(
        base + "\n\n🏦 ¿Qué tipo de cuenta? (Destino)",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_account_type_to)


@router.callback_query(TxFlow.waiting_account_type_to, F.data.startswith("acctypeto:"))
async def on_account_type_to_selected(callback: CallbackQuery, state: FSMContext):
    """User chose an account type for destination."""
    ptype = callback.data.split(":")[1]
    await state.update_data(account_type_to=ptype)
    await callback.answer()

    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)
    data = await state.get_data()
    from_account_id = data.get("account_id")

    filtered = [a for a in accounts if a.product_type == ptype and str(a.id) != from_account_id]

    if len(filtered) == 1:
        # Only 1 account of this type — auto-select
        acc = filtered[0]
        await state.update_data(account_to_id=str(acc.id))
        inst = f"{acc.institution.name} · " if acc.institution else ""
        lines = callback.message.text.split("\n")
        base = "\n".join(l for l in lines if "tipo de cuenta? (Destino)" not in l.lower()).rstrip()
        await callback.message.edit_text(
            base + f"\n✅ Destino: {inst}{acc.name}",
            parse_mode="Markdown",
        )
        await _ask_date(callback.message, state)
        return

    # Show specific accounts
    kb = InlineKeyboardBuilder()
    for acc in filtered:
        inst = f"{acc.institution.name} · " if acc.institution else ""
        digits = f" ···{acc.last_four_digits}" if acc.last_four_digits else ""
        balance_str = f" (${acc.balance:,.0f})"
        label = f"{inst}{acc.name}{digits}{balance_str}"
        kb.button(text=label, callback_data=f"accto:{acc.id}")
    kb.adjust(1)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    lines = callback.message.text.split("\n")
    base = "\n".join(l for l in lines if "tipo de cuenta? (Destino)" not in l.lower()).rstrip()
    await callback.message.edit_text(
        base + "\n\n🏦 ¿Cuál cuenta? (Destino)",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_account_to)


@router.callback_query(TxFlow.waiting_account_to, F.data.startswith("accto:"))
async def on_account_to_selected(callback: CallbackQuery, state: FSMContext):
    """User chose a destination account."""
    account_to_id = callback.data.split(":")[1]
    await callback.answer()

    user_id = await _get_user_id()
    async with AsyncSessionLocal() as db:
        acc_service = AccountService(db)
        acc = await acc_service.get_product(UUID(account_to_id), user_id)

    if not acc:
        await callback.message.answer("❌ Cuenta no encontrada.")
        await state.clear()
        return

    await state.update_data(account_to_id=account_to_id)
    inst = f"{acc.institution.name} · " if acc.institution else ""
    acc_name = f"{inst}{acc.name}"

    lines = callback.message.text.split("\n")
    base = "\n".join(l for l in lines if "cuenta? (Destino)" not in l.lower()).rstrip()
    await callback.message.edit_text(
        base + f"\n✅ Destino: {acc_name}",
        parse_mode="Markdown",
    )

    await _ask_date(callback.message, state)


async def _ask_category(message: types.Message, state: FSMContext):
    """Ask user to pick a category."""
    user_id = await _get_user_id()
    data = await state.get_data()
    tx_type = data["transaction_type"]
    cat_type = CategoryType.EXPENSE.value if tx_type == "EXPENSE" else CategoryType.INCOME.value
    categories = await _get_categories(user_id, cat_type)

    if not categories:
        await state.update_data(category_id=None)
        await _ask_date(message, state)
        return

    kb = InlineKeyboardBuilder()
    for cat in categories:
        icon = cat.icon or "📁"
        kb.button(text=f"{icon} {cat.name}", callback_data=f"cat:{cat.id}")
    kb.button(text="❌ Sin categoría", callback_data="cat:none")
    kb.adjust(2)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    await message.answer(
        "🏷️ ¿En qué categoría?",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_category)


# ---------------------------------------------------------------------------
# Step 5: Category selected → ask date
# ---------------------------------------------------------------------------
@router.callback_query(TxFlow.waiting_category, F.data.startswith("cat:"))
async def on_category_selected(callback: CallbackQuery, state: FSMContext):
    """User chose a category. Now ask for date."""
    cat_value = callback.data.split(":")[1]
    category_id = None if cat_value == "none" else cat_value
    await state.update_data(category_id=category_id)
    await callback.answer()

    # Get category name for display
    cat_display = "Sin categoría"
    if category_id:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Category).where(Category.id == UUID(category_id))
            )
            cat = result.scalar_one_or_none()
            if cat:
                cat_display = f"{cat.icon or '📁'} {cat.name}"

    lines = callback.message.text.split("\n")
    base = "\n".join(l for l in lines if "categoría?" not in l.lower()).rstrip()
    await callback.message.edit_text(
        base + f"\n✅ {cat_display}",
        parse_mode="Markdown",
    )

    await _ask_date(callback.message, state)


# ---------------------------------------------------------------------------
# Step 6: Date confirmation
# ---------------------------------------------------------------------------
async def _ask_date(message: types.Message, state: FSMContext):
    """Ask user to confirm today's date or change it."""
    today = _today_str()

    kb = InlineKeyboardBuilder()
    kb.button(text=f"✅ Hoy ({today})", callback_data="date:today")
    kb.button(text="📅 Cambiar", callback_data="date:change")
    kb.adjust(2)
    kb.row(InlineKeyboardButton(text="⬅️ Volver", callback_data="back"))

    await message.answer(
        f"📅 ¿La fecha es *hoy ({today})*?",
        reply_markup=kb.as_markup(),
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_date_confirm)


@router.callback_query(TxFlow.waiting_date_confirm, F.data == "date:today")
async def on_date_today(callback: CallbackQuery, state: FSMContext):
    """User confirmed today."""
    await state.update_data(date=datetime.now().isoformat())
    await callback.message.edit_text(f"✅ Fecha: hoy ({_today_str()})")
    await callback.answer()
    await _create_transaction(callback.message, state)


@router.callback_query(TxFlow.waiting_date_confirm, F.data == "date:change")
async def on_date_change(callback: CallbackQuery, state: FSMContext):
    """User wants custom date."""
    await callback.message.edit_text("📅 Cambiar fecha...")
    await callback.message.answer(
        "Escribí la fecha en formato *dd/mm*\n"
        "Ejemplo: `15/03`\n\n"
        "_(Si no ponés año, se usa el actual)_",
        parse_mode="Markdown",
    )
    await state.set_state(TxFlow.waiting_date_input)
    await callback.answer()


async def _on_date_input(message: types.Message, state: FSMContext):
    """Process custom date dd/mm or dd/mm/yyyy."""
    text = message.text.strip()
    try:
        parts = text.split("/")
        day = int(parts[0])
        month = int(parts[1])
        year = int(parts[2]) if len(parts) > 2 else datetime.now().year
        chosen = datetime(year, month, day)
        await state.update_data(date=chosen.isoformat())
        await message.answer(f"✅ Fecha: {chosen.strftime('%d/%m/%Y')}")
        await _create_transaction(message, state)
    except (ValueError, IndexError):
        await message.answer(
            "❌ Fecha inválida. Usá *dd/mm*\nEjemplo: `15/03`",
            parse_mode="Markdown",
        )


# ===========================================================================
# CREATE TRANSACTION
# ===========================================================================
async def _create_transaction(message: types.Message, state: FSMContext):
    """Create the transaction with all collected data."""
    data = await state.get_data()
    await state.clear()

    amount = Decimal(data["amount"])
    description = data["description"]
    tx_type = data["transaction_type"]
    account_id = UUID(data["account_id"])
    category_id = data.get("category_id")
    date = datetime.fromisoformat(data["date"])

    user_id = await _get_user_id()

    async with AsyncSessionLocal() as db:
        try:
            service = TransactionService(db)
            if tx_type == "TRANSFER":
                tx_data = TransferCreate(
                    amount=amount,
                    description=description,
                    date=date,
                    from_product_id=account_id,
                    to_product_id=UUID(data["account_to_id"])
                )
                await service.create_transfer(tx_data, user_id)
            else:
                tx_data = TransactionCreate(
                    amount=amount,
                    description=description,
                    date=date,
                    transaction_type=tx_type,
                    from_product_id=account_id,
                    category_id=UUID(category_id) if category_id else None,
                )
                await service.create_transaction(tx_data, user_id)

            # Build success message
            type_emoji = EMOJI_MAP.get(tx_type, "📝")
            type_label = _type_label(tx_type)
            date_str = date.strftime("%d/%m/%Y")

            # Get account name
            acc_service = AccountService(db)
            acc = await acc_service.get_product(account_id, user_id)
            acc_name = acc.name if acc else "?"

            cat_text = ""
            if category_id:
                result = await db.execute(
                    select(Category).where(Category.id == UUID(category_id))
                )
                cat = result.scalar_one_or_none()
                if cat:
                    cat_text = f"\n🏷️ Categoría: {cat.icon or '📁'} {cat.name}"

            # Action buttons after success
            kb = InlineKeyboardBuilder()
            kb.button(text="📝 Nuevo registro", callback_data="action:new")
            kb.button(text="📊 Ver resumen", callback_data="action:resumen")
            kb.button(text="📋 Últimos movimientos", callback_data="action:ultimos")
            kb.adjust(1)

            await message.answer(
                f"{type_emoji} *¡{type_label} registrado!*\n\n"
                f"💲 Monto: *${amount:,.2f}*\n"
                f"📝 {description}\n"
                f"📅 {date_str}\n"
                f"🏦 {acc_name}"
                f"{cat_text}",
                reply_markup=kb.as_markup(),
                parse_mode="Markdown",
            )

        except Exception as e:
            logger.error(f"Error creating transaction: {e}", exc_info=True)
            await message.answer(f"❌ Error al registrar: {e!s}")


# ===========================================================================
# BACK BUTTON HANDLER
# ===========================================================================
@router.callback_query(F.data == "back_to_start")
async def on_back_to_start(callback: CallbackQuery, state: FSMContext):
    """Cancel flow entirely from description prompt."""
    await callback.answer()
    await state.clear()
    await callback.message.edit_reply_markup(reply_markup=None)
    await _send_main_menu(callback.message, "❌ Operación cancelada.")


@router.callback_query(F.data == "back")
async def on_back(callback: CallbackQuery, state: FSMContext):
    """Handle all '⬅️ Volver' button clicks in the transaction flow."""
    current_state = await state.get_state()
    await callback.answer()

    if current_state == TxFlow.waiting_type:
        await state.set_state(TxFlow.waiting_description)
        await callback.message.edit_text(
            "📝 ¿Cuál es la descripción? (Volvé a escribirla)",
            parse_mode="Markdown",
        )

    elif current_state == TxFlow.waiting_account_type:
        await _ask_type(callback.message, state)

    elif current_state == TxFlow.waiting_account:
        await _ask_account_type(callback.message, state)

    elif current_state == TxFlow.waiting_category:
        data = await state.get_data()
        if "account_type" in data:
            await _ask_specific_account(callback.message, state)
        else:
            await _ask_account_type(callback.message, state)

    elif current_state == TxFlow.waiting_account_type_to:
        await _ask_specific_account(callback.message, state)

    elif current_state == TxFlow.waiting_account_to:
        await _ask_account_type_to(callback.message, state)

    elif current_state == TxFlow.waiting_date_confirm:
        data = await state.get_data()
        if data.get("transaction_type") == "TRANSFER":
            await _ask_account_type_to(callback.message, state)
        else:
            await _ask_category(callback.message, state)

    elif current_state == TxFlow.waiting_date_input:
        await _ask_date(callback.message, state)


# ---------------------------------------------------------------------------
# Noop handler for group headers in keyboards
# ---------------------------------------------------------------------------
@router.callback_query(F.data.startswith("noop:"))
async def on_noop(callback: CallbackQuery):
    """Ignore clicks on header/separator buttons."""
    await callback.answer()


# ---------------------------------------------------------------------------
# Quick action buttons (after registration)
# ---------------------------------------------------------------------------
@router.callback_query(F.data == "action:new")
async def on_action_new(callback: CallbackQuery, state: FSMContext):
    """Start a new registration flow."""
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(
        "📝 *Nuevo registro*\n\nEnviame el monto:",
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "action:resumen")
async def on_action_resumen(callback: CallbackQuery):
    """Show balances."""
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    # Reuse the resumen logic
    user_id = await _get_user_id()
    accounts = await _get_accounts(user_id)

    if not accounts:
        await callback.message.answer("No tenés cuentas registradas.")
        return

    text = _format_balances(accounts)

    kb = InlineKeyboardBuilder()
    kb.button(text="📝 Nuevo registro", callback_data="action:new")
    kb.button(text="📋 Últimos movimientos", callback_data="action:ultimos")
    kb.adjust(2)

    await callback.message.answer(text, reply_markup=kb.as_markup(), parse_mode="Markdown")


@router.callback_query(F.data == "action:ultimos")
async def on_action_ultimos(callback: CallbackQuery):
    """Show last transactions."""
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    user_id = await _get_user_id()

    async with AsyncSessionLocal() as db:
        service = TransactionService(db)
        transactions = await service.get_transactions(user_id=user_id, limit=5)

    if not transactions:
        await callback.message.answer("No tenés transacciones todavía.")
        return

    text = _format_transactions(transactions)

    # Add action buttons
    kb = InlineKeyboardBuilder()
    kb.button(text="📝 Nuevo registro", callback_data="action:new")
    kb.button(text="📊 Ver resumen", callback_data="action:resumen")
    kb.adjust(2)

    await callback.message.answer(text, reply_markup=kb.as_markup(), parse_mode="Markdown")


# ---------------------------------------------------------------------------
# Bot lifecycle
# ---------------------------------------------------------------------------
async def start_bot():
    """Start the bot in polling mode (local dev)."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Bot will not start.")
        return
    logger.info("Starting Telegram Bot (polling)...")
    await dp.start_polling(bot)


async def setup_webhook(webhook_url: str, secret: str = ""):
    """Register webhook with Telegram."""
    if not bot:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Webhook not configured.")
        return
    await bot.set_webhook(
        url=webhook_url,
        secret_token=secret or None,
        drop_pending_updates=True,
    )
    logger.info(f"Webhook set to: {webhook_url}")
