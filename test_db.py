import asyncio
import os
import sys
from uuid import uuid4

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.config import settings
print(f"Using DB URL: {settings.DATABASE_URL_CLEAN}")

from app.database import AsyncSessionLocal, engine
from app.models import FinancialInstitution, InstitutionType

async def test_db():
    async with AsyncSessionLocal() as session:
        try:
            # Try to list institutions
            from sqlalchemy import select
            result = await session.execute(select(FinancialInstitution))
            institutions = result.scalars().all()
            print(f"Current institutions: {len(institutions)}")
            
            # Try to create one with a NON-EXISTENT user_id
            random_user_id = uuid4()
            print(f"Trying to create institution with non-existent user_id: {random_user_id}")
            
            inst = FinancialInstitution(
                name=f"Test Inst {uuid4().hex[:8]}",
                institution_type=InstitutionType.BANK.value,
                user_id=random_user_id
            )
            session.add(inst)
            try:
                await session.commit()
                print("Wait, commit succeeded? That's unexpected if user doesn't exist.")
            except Exception as e:
                print(f"Commit failed as expected for non-existent user: {e}")
                await session.rollback()
            
            # Now try with a REAL user
            from app.models import User
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            
            if not user:
                print("No users found. Creating a test user.")
                user = User(id=uuid4(), email=f"test{uuid4().hex[:4]}@example.com", name="Test User")
                session.add(user)
                await session.commit()
                await session.refresh(user)
            
            print(f"Using REAL user: {user.id}")
            
            inst = FinancialInstitution(
                name=f"Test Inst {uuid4().hex[:8]}",
                institution_type=InstitutionType.BANK.value,
                user_id=user.id
            )
            session.add(inst)
            print("Adding institution...")
            await session.commit()
            print("Commit successful!")
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
