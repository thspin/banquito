"""Transactions router - API endpoints for transactions and transfers."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.services import TransactionService
from app.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionDetailResponse,
    TransferCreate,
    SuccessResponse,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    product_id: UUID = None,
    category_id: UUID = None,
    transaction_type: str = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get transactions with optional filters."""
    service = TransactionService(db)
    transactions = await service.get_transactions(
        user_id=user_id,
        product_id=product_id,
        category_id=category_id,
        transaction_type=transaction_type,
        limit=limit,
        offset=offset
    )
    return transactions


@router.post("", response_model=List[TransactionResponse], status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Create a new transaction.
    
    If installments > 1, creates multiple transactions for each installment.
    Returns list of created transactions.
    """
    service = TransactionService(db)
    
    try:
        transactions = await service.create_transaction(data, user_id)
        return transactions
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{transaction_id}", response_model=TransactionDetailResponse)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific transaction by ID."""
    service = TransactionService(db)
    transaction = await service.get_transaction(transaction_id, user_id)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Update a transaction."""
    service = TransactionService(db)
    transaction = await service.update_transaction(transaction_id, data, user_id)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Delete a transaction and revert balance changes."""
    service = TransactionService(db)
    deleted = await service.delete_transaction(transaction_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return {"success": True, "message": "Transaction deleted successfully"}


@router.get("/installments/{installment_id}", response_model=List[TransactionResponse])
async def get_installment_group(
    installment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get all transactions in an installment group."""
    service = TransactionService(db)
    transactions = await service.get_installment_group(installment_id, user_id)
    return transactions


# ============== Transfer Endpoints ==============

@router.post("/transfers", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    data: TransferCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create a transfer between two products."""
    service = TransactionService(db)
    
    try:
        transaction = await service.create_transfer(data, user_id)
        return transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
