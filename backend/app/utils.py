"""Common utilities for FastAPI routers."""

from typing import TypeVar, Callable, Any
from fastapi import HTTPException, status

T = TypeVar('T')


class RouterUtils:
    """Utility functions for API routers."""
    
    @staticmethod
    def handle_not_found(result: T | None, detail: str = "Resource not found") -> T:
        """
        Raise HTTPException(404) if result is None, otherwise return result.
        
        Usage:
            institution = await service.get_institution(id, user_id)
            return RouterUtils.handle_not_found(institution, "Institution not found")
        """
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail
            )
        return result
    
    @staticmethod
    def handle_value_error(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """
        Execute a function and convert ValueError to HTTPException(400).
        
        Usage:
            return RouterUtils.handle_value_error(
                service.create_product, data, user_id
            )
        """
        try:
            return func(*args, **kwargs)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    @staticmethod
    async def async_handle_value_error(
        func: Callable[..., Any], 
        *args: Any, 
        **kwargs: Any
    ) -> Any:
        """
        Execute an async function and convert ValueError to HTTPException(400).
        
        Usage:
            return await RouterUtils.async_handle_value_error(
                service.create_product, data, user_id
            )
        """
        try:
            return await func(*args, **kwargs)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    @staticmethod
    def success_response(message: str, data: dict | None = None) -> dict:
        """Create a standardized success response."""
        response = {"success": True, "message": message}
        if data:
            response.update(data)
        return response
