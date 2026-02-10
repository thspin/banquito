"""Accounts router - API endpoints for institutions and products."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.services import AccountService
from app.schemas import (
    FinancialInstitutionCreate,
    FinancialInstitutionUpdate,
    FinancialInstitutionResponse,
    FinancialProductCreate,
    FinancialProductUpdate,
    FinancialProductResponse,
    FinancialProductDetailResponse,
    InstitutionWithProductsResponse,
    SuccessResponse,
    ErrorResponse,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


# ============== Institution Endpoints ==============

@router.get("/institutions", response_model=List[FinancialInstitutionResponse])
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get all financial institutions for the current user."""
    service = AccountService(db)
    institutions = await service.get_institutions(user_id)
    return institutions


@router.post("/institutions", response_model=FinancialInstitutionResponse, status_code=status.HTTP_201_CREATED)
async def create_institution(
    data: FinancialInstitutionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create a new financial institution."""
    service = AccountService(db)
    institution = await service.create_institution(data, user_id)
    return institution


@router.get("/institutions/{institution_id}", response_model=FinancialInstitutionResponse)
async def get_institution(
    institution_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific institution by ID."""
    service = AccountService(db)
    institution = await service.get_institution(institution_id, user_id)
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return institution


@router.put("/institutions/{institution_id}", response_model=FinancialInstitutionResponse)
async def update_institution(
    institution_id: UUID,
    data: FinancialInstitutionUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Update an institution."""
    service = AccountService(db)
    institution = await service.update_institution(institution_id, data, user_id)
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return institution


@router.delete("/institutions/{institution_id}")
async def delete_institution(
    institution_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Delete an institution."""
    service = AccountService(db)
    deleted = await service.delete_institution(institution_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    return {"success": True, "message": "Institution deleted successfully"}


# ============== Product Endpoints ==============

@router.get("/products", response_model=List[FinancialProductResponse])
async def list_products(
    institution_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get all financial products for the current user."""
    service = AccountService(db)
    products = await service.get_products(user_id, institution_id)
    return products


@router.post("/products", response_model=FinancialProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: FinancialProductCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create a new financial product."""
    service = AccountService(db)
    
    try:
        product = await service.create_product(data, user_id)
        return product
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/products/{product_id}", response_model=FinancialProductDetailResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific product by ID with details."""
    service = AccountService(db)
    product = await service.get_product(product_id, user_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product


@router.put("/products/{product_id}", response_model=FinancialProductResponse)
async def update_product(
    product_id: UUID,
    data: FinancialProductUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Update a product."""
    service = AccountService(db)
    product = await service.update_product(product_id, data, user_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Delete a product."""
    service = AccountService(db)
    deleted = await service.delete_product(product_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return {"success": True, "message": "Product deleted successfully"}


# ============== Combined Endpoints ==============

@router.get("/institutions-with-products", response_model=List[InstitutionWithProductsResponse])
async def list_institutions_with_products(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get all institutions with their products."""
    service = AccountService(db)
    
    # Get all institutions
    institutions = await service.get_institutions(user_id)
    
    if not institutions:
        return []
    
    # Get all institution IDs
    institution_ids = [inst.id for inst in institutions]
    
    # Fetch all products for all institutions in a single query (avoids N+1)
    products_by_institution = await service.get_products_by_institutions_batch(
        user_id, institution_ids
    )
    
    # Assign products to institutions
    for institution in institutions:
        institution.products = products_by_institution.get(institution.id, [])
    
    return institutions
