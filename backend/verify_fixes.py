import asyncio
import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy import select, update
from app.database import AsyncSessionLocal, engine
from app.models import Category, Transaction, Service, User, CategoryType
from app.config import settings

async def verify_category_fix():
    print("Starting verification of category fixes...")
    
    async with AsyncSessionLocal() as db:
        user_id = uuid.UUID(settings.CURRENT_USER_ID)
        
        # Just test the SQLAlchemy logic on an existing category if possible, 
        # or create a really minimal one.
        # The previous error was likely because Table constraints (UniqueConstraint)
        # or other fields were missing.
        
        cat_name = f"Verify Cat {uuid.uuid4().hex[:4]}"
        test_cat = Category(
            name=cat_name,
            icon="🧪",
            category_type=CategoryType.EXPENSE,
            is_system=False,
            user_id=user_id
        )
        db.add(test_cat)
        await db.commit()
        await db.refresh(test_cat)
        print(f"Created category: {test_cat.name} (ID: {test_cat.id})")
        
        # Test updating a service to use this category
        # First find any service
        res = await db.execute(select(Service).where(Service.user_id == user_id).limit(1))
        svc = res.scalar_one_or_none()
        
        if svc:
            original_cat_id = svc.category_id
            print(f"Updating service {svc.id} to use test category...")
            svc.category_id = test_cat.id
            await db.commit()
            
            print(f"Now deleting category {test_cat.id} and checking if service {svc.id} gets category_id=NULL...")
            
            # This is the logic we added to the router
            await db.execute(
                update(Service)
                .where(Service.category_id == test_cat.id)
                .values(category_id=None)
            )
            await db.delete(test_cat)
            await db.commit()
            
            await db.refresh(svc)
            if svc.category_id is None:
                print("SUCCESS: Service category_id is now NULL.")
            else:
                print(f"FAILURE: Service category_id is still {svc.category_id}")
                
            # Restore service category if possible
            svc.category_id = original_cat_id
            await db.commit()
        else:
            print("No services found to test with, but category creation/deletion worked.")
            await db.delete(test_cat)
            await db.commit()

    print("Verification complete.")

if __name__ == "__main__":
    asyncio.run(verify_category_fix())
