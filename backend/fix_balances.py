import asyncio
from sqlalchemy import update
from app.database import AsyncSessionLocal
from app.models import FinancialProduct

async def main():
    async with AsyncSessionLocal() as session:
        await session.execute(update(FinancialProduct).values(balance=0))
        await session.commit()
    print("Balances reset to 0.")

if __name__ == "__main__":
    asyncio.run(main())
