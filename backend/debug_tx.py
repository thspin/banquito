import asyncio
from app.database import AsyncSessionLocal
from app.services.transaction_service import TransactionService
from uuid import UUID

async def main():
    async with AsyncSessionLocal() as db:
        s = TransactionService(db)
        txs = await s.get_transactions(
            user_id=UUID("550e8400-e29b-41d4-a716-446655440000"), limit=3
        )
        for t in txs:
            print(f"amount={t.amount} type={t.transaction_type} desc={t.description}")

asyncio.run(main())
