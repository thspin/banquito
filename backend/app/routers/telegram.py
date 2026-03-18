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
from app.models import FinancialProduct, TransactionType, Category
from app.schemas import TransactionCreate
from app.services.transaction_service import TransactionService

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

async def get_default_product(db: AsyncSession, user_id: uuid.UUID) -> Optional[FinancialProduct]:
    """Get the first available financial product for the user to use as default."""
    result = await db.execute(select(FinancialProduct).where(FinancialProduct.user_id == user_id))
    return result.scalars().first()

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

async def send_telegram_message(chat_id: int, text: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{TELEGRAM_API_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text}
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
    product = await get_default_product(db, user_id)
    
    if not product:
        await send_telegram_message(chat_id, "⚠️ No tienes ninguna cuenta o billetera configurada en Banquito. Crea una primero.")
        return {"status": "no_product"}

    transaction_svc = TransactionService(db)

    # 1. Handle Document (CSV)
    if update.message.document:
        doc = update.message.document
        if not doc.file_name.endswith('.csv'):
            await send_telegram_message(chat_id, "⚠️ Solo acepto archivos .csv por ahora.")
            return {"status": "invalid_format"}
            
        await send_telegram_message(chat_id, "⏳ Procesando tu archivo CSV...")
        
        async with httpx.AsyncClient() as client:
            # Get file path
            file_info = await client.get(f"{TELEGRAM_API_URL}/getFile?file_id={doc.file_id}")
            file_path = file_info.json().get('result', {}).get('file_path')
            
            if not file_path:
                await send_telegram_message(chat_id, "❌ Error al obtener el archivo de Telegram.")
                return {"status": "file_error"}
                
            # Download file
            file_response = await client.get(f"{TELEGRAM_FILE_URL}/{file_path}")
            csv_text = file_response.text

        # Parse CSV
        reader = csv.reader(io.StringIO(csv_text))
        headers = next(reader, None) # skip header
        
        count = 0
        for row in reader:
            if len(row) >= 3:
                # Expected format: Date, Amount, Description, [Category]
                try:
                    date_str, amount_str, description = row[0], row[1], row[2]
                    date_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    amount = float(amount_str.strip())
                    
                    category_id = None
                    if len(row) >= 4 and row[3].strip():
                        category = await get_or_create_category(db, user_id, row[3].strip())
                        category_id = category.id

                    t_create = TransactionCreate(
                        amount=abs(amount),
                        date=date_obj,
                        description=description.strip(),
                        transaction_type=TransactionType.INCOME if amount > 0 else TransactionType.EXPENSE,
                        from_product_id=product.id,
                        category_id=category_id,
                        installments=1
                    )
                    await transaction_svc.create_transaction(t_create, user_id)
                    count += 1
                except Exception as e:
                    print(f"Error parseando fila {row}: {e}")
                    continue
        
        await send_telegram_message(chat_id, f"✅ CSV Procesado exitosamente. Se guardaron {count} transacciones.")
        return {"status": "csv_processed"}

    # 2. Handle Text
    text = update.message.text
    if text:
        if text.startswith("/start"):
            await send_telegram_message(chat_id, "👋 ¡Hola! Soy Banquito Bot.\nEnvíame un gasto así: `Café 1500 Comida` o súbeme un archivo .csv con tus transacciones.")
            return {"status": "ok"}
        elif text.startswith("/help"):
            await send_telegram_message(chat_id, "📝 Instrucciones:\n- Texto: `[Descripción] [Monto] [Categoría opcional]`\n- CSV: Archivo con columnas `Fecha (YYYY-MM-DD), Monto, Descripción, Categoría`.")
            return {"status": "ok"}
        
        # Parse fast text expense
        parts = text.split()
        if len(parts) >= 2:
            try:
                # Find the amount (assume it's the first thing that looks like a number)
                amount = None
                amount_idx = -1
                for i, p in enumerate(parts):
                    try:
                        amount = float(p.replace(',', '.'))
                        amount_idx = i
                        break
                    except ValueError:
                        continue
                        
                if amount is not None:
                    description = " ".join(parts[:amount_idx])
                    if not description:
                        description = "Gasto general"
                        
                    category_name = "General"
                    if amount_idx < len(parts) - 1:
                        category_name = " ".join(parts[amount_idx+1:])
                        
                    category = await get_or_create_category(db, user_id, category_name)
                    
                    t_create = TransactionCreate(
                        amount=abs(amount),
                        date=datetime.now(timezone.utc),
                        description=description,
                        transaction_type=TransactionType.EXPENSE, # default for fast text
                        from_product_id=product.id,
                        category_id=category.id,
                        installments=1
                    )
                    await transaction_svc.create_transaction(t_create, user_id)
                    await send_telegram_message(chat_id, f"✅ Gasto guardado: {description} por ${amount}")
                else:
                    await send_telegram_message(chat_id, "❌ No encontré el monto. Úsalo así: `Café 1500 Comida`")
            except Exception as e:
                await send_telegram_message(chat_id, "❌ Error al guardar el gasto.")
                print(e)
        else:
            await send_telegram_message(chat_id, "❌ Formato incorrecto. Úsalo así: `Café 1500 Comida`")
            
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
