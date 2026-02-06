"""Categories router - API endpoints for transaction categories."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.models import Category, CategoryType
from app.schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    category_type: str = None,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get all categories for the current user."""
    query = select(Category).where(Category.user_id == user_id)
    
    if category_type:
        query = query.where(Category.category_type == category_type)
    
    query = query.order_by(Category.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create a new category."""
    # Check if category with same name already exists
    result = await db.execute(
        select(Category)
        .where(
            and_(
                Category.name == data.name,
                Category.user_id == user_id
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{data.name}' already exists"
        )
    
    category = Category(
        name=data.name,
        icon=data.icon,
        category_type=data.category_type,
        is_system=False,
        user_id=user_id
    )
    
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific category by ID."""
    result = await db.execute(
        select(Category)
        .where(
            and_(
                Category.id == category_id,
                Category.user_id == user_id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Update a category."""
    result = await db.execute(
        select(Category)
        .where(
            and_(
                Category.id == category_id,
                Category.user_id == user_id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Don't allow editing system categories
    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify system categories"
        )
    
    if data.name is not None:
        # Check for name conflict
        result = await db.execute(
            select(Category)
            .where(
                and_(
                    Category.name == data.name,
                    Category.user_id == user_id,
                    Category.id != category_id
                )
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with name '{data.name}' already exists"
            )
        category.name = data.name
    
    if data.icon is not None:
        category.icon = data.icon
    
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Delete a category."""
    result = await db.execute(
        select(Category)
        .where(
            and_(
                Category.id == category_id,
                Category.user_id == user_id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Don't allow deleting system categories
    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system categories"
        )
    
    # Check if category has transactions
    if category.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with transactions"
        )
    
    await db.delete(category)
    await db.commit()
    
    return {"success": True, "message": "Category deleted successfully"}


@router.post("/seed", response_model=dict)
async def seed_default_categories(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create default categories for a new user."""
    default_categories = [
        # Income categories
        {"name": "Salario", "icon": "💰", "type": CategoryType.INCOME},
        {"name": "Freelance", "icon": "💻", "type": CategoryType.INCOME},
        {"name": "Inversiones", "icon": "📈", "type": CategoryType.INCOME},
        {"name": "Otros Ingresos", "icon": "💵", "type": CategoryType.INCOME},
        
        # Expense categories
        {"name": "Comida", "icon": "🍔", "type": CategoryType.EXPENSE},
        {"name": "Transporte", "icon": "🚗", "type": CategoryType.EXPENSE},
        {"name": "Vivienda", "icon": "🏠", "type": CategoryType.EXPENSE},
        {"name": "Servicios", "icon": "💡", "type": CategoryType.EXPENSE},
        {"name": "Salud", "icon": "⚕️", "type": CategoryType.EXPENSE},
        {"name": "Entretenimiento", "icon": "🎬", "type": CategoryType.EXPENSE},
        {"name": "Educación", "icon": "📚", "type": CategoryType.EXPENSE},
        {"name": "Ropa", "icon": "👕", "type": CategoryType.EXPENSE},
        {"name": "Regalos", "icon": "🎁", "type": CategoryType.EXPENSE},
        {"name": "Otros Gastos", "icon": "🛒", "type": CategoryType.EXPENSE},
    ]
    
    created = []
    for cat_data in default_categories:
        # Check if already exists
        result = await db.execute(
            select(Category)
            .where(
                and_(
                    Category.name == cat_data["name"],
                    Category.user_id == user_id
                )
            )
        )
        if not result.scalar_one_or_none():
            category = Category(
                name=cat_data["name"],
                icon=cat_data["icon"],
                category_type=cat_data["type"],
                is_system=True,
                user_id=user_id
            )
            db.add(category)
            created.append(cat_data["name"])
    
    if created:
        await db.commit()
    
    return {
        "success": True,
        "message": f"Created {len(created)} default categories",
        "categories": created
    }
