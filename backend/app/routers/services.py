"""Services router - API endpoints for recurring services and bills."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.services import ServiceBillService
from app.schemas import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceBillCreate,
    ServiceBillUpdate,
    ServiceBillResponse,
    ServiceBillPayRequest,
    TransactionResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/services", tags=["services"])


# ============== Service Endpoints ==============

@router.get("", response_model=List[ServiceResponse])
async def list_services(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get all services for the current user."""
    service = ServiceBillService(db)
    services = await service.get_services(user_id, active_only)
    return services


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create a new recurring service."""
    service = ServiceBillService(db)
    new_service = await service.create_service(data, user_id)
    return new_service


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific service by ID."""
    service = ServiceBillService(db)
    result = await service.get_service(service_id, user_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return result


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Update a service."""
    service = ServiceBillService(db)
    updated = await service.update_service(service_id, data, user_id)
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return updated


@router.delete("/{service_id}")
async def delete_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Delete a service."""
    service = ServiceBillService(db)
    deleted = await service.delete_service(service_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return {"success": True, "message": "Service deleted successfully"}


# ============== Bill Endpoints ==============

@router.get("/bills", response_model=List[ServiceBillResponse])
async def list_bills(
    year: int = None,
    month: int = None,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get bills with optional filters."""
    service = ServiceBillService(db)
    bills = await service.get_bills(user_id, year, month, status)
    return bills


@router.get("/bills/monthly/{year}/{month}", response_model=List[ServiceBillResponse])
async def get_monthly_bills(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """
    Get or create bills for a specific month.
    
    Automatically creates bills for all active services if they don't exist.
    """
    service = ServiceBillService(db)
    bills = await service.get_or_create_monthly_bills(user_id, year, month)
    return bills


@router.post("/bills", response_model=ServiceBillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    data: ServiceBillCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Create a new bill manually."""
    service = ServiceBillService(db)
    
    try:
        bill = await service.create_bill(data, user_id)
        return bill
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/bills/{bill_id}", response_model=ServiceBillResponse)
async def get_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Get a specific bill by ID."""
    service = ServiceBillService(db)
    bill = await service.get_bill(bill_id, user_id)
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return bill


@router.put("/bills/{bill_id}", response_model=ServiceBillResponse)
async def update_bill(
    bill_id: UUID,
    data: ServiceBillUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Update a bill."""
    service = ServiceBillService(db)
    updated = await service.update_bill(bill_id, data, user_id)
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return updated


@router.post("/bills/{bill_id}/pay", response_model=TransactionResponse)
async def pay_bill(
    bill_id: UUID,
    data: ServiceBillPayRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Pay a bill, creating a transaction."""
    service = ServiceBillService(db)
    
    try:
        transaction = await service.pay_bill(bill_id, data, user_id)
        return transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/bills/{bill_id}/skip", response_model=ServiceBillResponse)
async def skip_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Mark a bill as skipped (won't pay this month)."""
    service = ServiceBillService(db)
    
    try:
        bill = await service.skip_bill(bill_id, user_id)
        
        if not bill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bill not found"
            )
        
        return bill
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/bills/{bill_id}")
async def delete_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    """Delete a bill."""
    service = ServiceBillService(db)
    deleted = await service.delete_bill(bill_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return {"success": True, "message": "Bill deleted successfully"}
