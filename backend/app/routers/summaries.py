"""Summaries router - API endpoints for credit card summaries."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models import User
from app.services import SummaryService
from app.schemas import (
    CreditCardSummaryCreate,
    CreditCardSummaryUpdate,
    CreditCardSummaryResponse,
    CreditCardSummaryDetailResponse,
    SummaryAdjustmentCreate,
    SummaryAdjustmentResponse,
    SummaryPayRequest,
    SummaryProjectionResponse,
    TransactionResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.get("/product/{product_id}", response_model=List[CreditCardSummaryResponse])
async def list_summaries(
    product_id: UUID,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all summaries for a credit card."""
    service = SummaryService(db)
    summaries = await service.get_summaries(product_id, user.id, status)
    return summaries


@router.post("/product/{product_id}", response_model=CreditCardSummaryResponse)
async def generate_summary(
    product_id: UUID,
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Generate or get a summary for a specific month."""
    service = SummaryService(db)
    
    try:
        data = CreditCardSummaryCreate(product_id=product_id, year=year, month=month)
        summary = await service.generate_summary(data, user.id)
        return summary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{summary_id}", response_model=CreditCardSummaryDetailResponse)
async def get_summary(
    summary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get a specific summary with all details."""
    service = SummaryService(db)
    summary = await service.get_summary(summary_id, user.id)
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found"
        )
    
    return summary


@router.put("/{summary_id}", response_model=CreditCardSummaryResponse)
async def update_summary(
    summary_id: UUID,
    data: CreditCardSummaryUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update summary dates or status."""
    service = SummaryService(db)
    
    # Note: This method is not implemented in service yet
    # Would need to add update_summary method to SummaryService
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Update summary not implemented yet"
    )


@router.post("/{summary_id}/close", response_model=CreditCardSummaryResponse)
async def close_summary(
    summary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Close a summary (mark as ready to pay)."""
    service = SummaryService(db)
    
    try:
        summary = await service.close_summary(summary_id, user.id)
        return summary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{summary_id}/pay", response_model=TransactionResponse)
async def pay_summary(
    summary_id: UUID,
    data: SummaryPayRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Pay a summary.
    
    Processes Plan Z transactions, creates payment transaction,
    and updates all balances.
    """
    service = SummaryService(db)
    
    try:
        transaction = await service.pay_summary(summary_id, data, user.id)
        return transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{summary_id}/reset", response_model=CreditCardSummaryResponse)
async def reset_summary(
    summary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Reset a summary (remove all items and adjustments)."""
    service = SummaryService(db)
    
    try:
        summary = await service.reset_summary(summary_id, user.id)
        return summary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============== Adjustments Endpoints ==============

@router.post("/{summary_id}/adjustments", response_model=SummaryAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def add_adjustment(
    summary_id: UUID,
    data: SummaryAdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Add an adjustment to a summary (tax, fee, interest, etc.)."""
    service = SummaryService(db)
    
    try:
        adjustment = await service.add_adjustment(summary_id, data, user.id)
        return adjustment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{summary_id}/adjustments/{adjustment_id}")
async def delete_adjustment(
    summary_id: UUID,
    adjustment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete an adjustment from a summary."""
    service = SummaryService(db)
    
    try:
        deleted = await service.delete_adjustment(adjustment_id, user.id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Adjustment not found"
            )
        
        return {"success": True, "message": "Adjustment deleted successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============== Projections Endpoints ==============

@router.get("/product/{product_id}/projections", response_model=List[SummaryProjectionResponse])
async def get_projected_summaries(
    product_id: UUID,
    months_ahead: int = 12,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get projected summaries for upcoming months."""
    service = SummaryService(db)
    
    try:
        projections = await service.get_projected_summaries(product_id, user.id, months_ahead)
        return projections
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/product/{product_id}/current", response_model=CreditCardSummaryResponse)
async def get_current_summary(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get or generate current month's summary for a credit card."""
    from datetime import datetime
    
    service = SummaryService(db)
    now = datetime.now()
    
    try:
        data = CreditCardSummaryCreate(product_id=product_id, year=now.year, month=now.month)
        summary = await service.generate_summary(data, user.id)
        return summary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
