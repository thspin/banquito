import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import Transaction, TransactionType, Category

router = APIRouter(tags=["Telegram"])

TELEGRAM_API_URL = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
TELEGRAM_FILE_URL = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}"

class Document(BaseModel):
    file_id: str
    file_name: Optional[str] = None
    mime_type: Optional[str] = None

class Message(BaseModel):
    message_id: int
    text: Optional[str] = None
    document: Optional[Document] = None

class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[Message] = None


async def get_or_create_category(db: AsyncSession, user_id: uuid.UUID, name: str) -> Category:
    name = name.strip()
    result = await db.execute(select(Category).where(Category.user_id == user_id, Category.name.ilike(name)))
    category = result.scalars().first()
    if not category:
        category = Category(name=name, user_id=user_id, category_type="EXPENSE", is_system=False)
        db.add(category)
        await db.commit()
        await db.refresh(category)
    return category


async def save_transaction(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: float,
    description: str,
    date: datetime,
    category_id: Optional[uuid.UUID] = None,
    transaction_type: str = "EXPENSE",
) -> Transaction:
    """Insert a transaction directly — no account/product required."""
    t = Transaction(
        amount=abs(amount),
        date=date,
        description=description,
        transaction_type=transaction_type,
        status="COMPLETED",
        user_id=user_id,
        category_id=category_id,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


async def send_telegram_message(chat_id: int, text: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{TELEGRAM_API_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
        )

@router.post("/webhook")
async def telegram_webhook(update: TelegramUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    """Handle incoming Telegram updates."""
    if not update.message:
        return {"status": "ignored"}
        
    # Extract chat_id from raw JSON
    raw_data = await request.json()
    chat_id = raw_data.get("message", {}).get("chat", {}).get("id")
    if not chat_id:
        return {"status": "no_chat"}

    user_id = uuid.UUID(settings.CURRENT_USER_ID)

    # 1. Handle Document (CSV)
    if update.message.document:
        doc = update.message.document
        if not doc.file_name or not doc.file_name.endswith('.csv'):
            await send_telegram_message(chat_id, "⚠️ Solo acepto archivos .csv por ahora.")
            return {"status": "invalid_format"}
            
        await send_telegram_message(chat_id, "⏳ Procesando tu archivo CSV...")
        
        async with httpx.AsyncClient() as client:
            file_info = await client.get(f"{TELEGRAM_API_URL}/getFile?file_id={doc.file_id}")
            file_path = file_info.json().get('result', {}).get('file_path')
            
            if not file_path:
                await send_telegram_message(chat_id, "❌ Error al obtener el archivo de Telegram.")
                return {"status": "file_error"}
                
            file_response = await client.get(f"{TELEGRAM_FILE_URL}/{file_path}")
            csv_text = file_response.text

        # Parse CSV — expected columns: Fecha (YYYY-MM-DD), Monto, Descripción, [Categoría]
        reader = csv.reader(io.StringIO(csv_text))
        next(reader, None)  # skip header
        
        count = 0
        errors = 0
        for row in reader:
            if len(row) >= 3:
                try:
                    date_str, amount_str, description = row[0].strip(), row[1].strip(), row[2].strip()
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    amount = float(amount_str.replace(",", "."))
                    
                    category_id = None
                    if len(row) >= 4 and row[3].strip():
                        category = await get_or_create_category(db, user_id, row[3].strip())
                        category_id = category.id

                    t_type = TransactionType.INCOME.value if amount > 0 else TransactionType.EXPENSE.value
                    await save_transaction(db, user_id, amount, description, date_obj, category_id, t_type)
                    count += 1
                except Exception as e:
                    print(f"Error parseando fila {row}: {e}")
                    errors += 1
                    continue
        
        msg = f"✅ CSV procesado: *{count}* transacciones guardadas."
        if errors:
            msg += f"\n⚠️ {errors} filas con errores."
        await send_telegram_message(chat_id, msg)
        return {"status": "csv_processed"}

    # 2. Handle Text
    text = update.message.text
    if not text:
        return {"status": "ok"}

    if text.startswith("/start"):
        await send_telegram_message(
            chat_id,
            "👋 ¡Hola! Soy *Banquito Bot*.\n\n"
            "Registrá un gasto así:\n"
            "`Café 1500 Comida`\n"
            "`1500 helado`\n\n"
            "O subime un archivo *.csv* con tus transacciones.\n"
            "Columnas: `Fecha (YYYY-MM-DD), Monto, Descripción, Categoría`"
        )
        return {"status": "ok"}

    if text.startswith("/help"):
        await send_telegram_message(
            chat_id,
            "📝 *Cómo usar Banquito Bot:*\n\n"
            "*Gasto rápido:*\n`[Descripción] [Monto] [Categoría]`\n"
            "Ej: `Supermercado 8500 Comida`\n\n"
            "*CSV masivo:*\nSubí un archivo con columnas:\n`Fecha,Monto,Descripción,Categoría`"
        )
        return {"status": "ok"}
    
    # Parse fast text expense: [Descripción] Monto [Categoría]
    parts = text.split()
    if len(parts) < 1:
        await send_telegram_message(chat_id, "❌ Formato incorrecto. Escribí: `Café 1500 Comida`")
        return {"status": "ok"}

    try:
        # Find the first token that looks like a number
        amount = None
        amount_idx = -1
        for i, p in enumerate(parts):
            try:
                amount = float(p.replace(',', '.'))
                amount_idx = i
                break
            except ValueError:
                continue
                
        if amount is None:
            await send_telegram_message(chat_id, "❌ No encontré el monto. Ej: `Café 1500 Comida`")
            return {"status": "ok"}

        description = " ".join(parts[:amount_idx]).strip() or "Gasto general"
        category_name = " ".join(parts[amount_idx + 1:]).strip() or "General"

        category = await get_or_create_category(db, user_id, category_name)

        await save_transaction(
            db, user_id, amount, description,
            datetime.now(timezone.utc),
            category.id,
            TransactionType.EXPENSE.value,
        )
        await send_telegram_message(
            chat_id,
            f"✅ *{description}* — ${amount:,.0f} [{category_name}]"
        )
    except Exception as e:
        await send_telegram_message(chat_id, f"❌ Error: {str(e)[:200]}")
        print(f"Transaction error: {e}")

    return {"status": "ok"}


@router.get("/setup_webhook")
async def setup_webhook(request: Request):
    """Utility endpoint to set the Telegram webhook URL to this server."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="TELEGRAM_BOT_TOKEN is not set")
        
    base_url = str(request.base_url)
    if "localhost" not in base_url and "127.0.0.1" not in base_url:
         base_url = base_url.replace("http://", "https://")
    if base_url.endswith("/"):
        base_url = base_url[:-1]
        
    webhook_url = f"{base_url}/api/telegram/webhook"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{TELEGRAM_API_URL}/setWebhook",
            json={"url": webhook_url, "drop_pending_updates": True}
        )
        data = response.json()
        
    return {"webhook_url": webhook_url, "telegram_response": data}
