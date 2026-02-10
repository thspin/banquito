import sys
import os
import traceback

# Add the backend directory to sys.path
backend_path = os.path.join(os.path.dirname(__file__), '../backend')
sys.path.insert(0, backend_path)

try:
    from app.main import app
except Exception as import_error:
    error_details = traceback.format_exc()
    print(f"CRITICAL ERROR LOADING APP: {import_error}\n{error_details}", file=sys.stderr)
    
    # Store error for use in endpoints
    _import_error = import_error
    _error_details = error_details
    
    # Create minimal error app
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    
    app = FastAPI()
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Application failed to load",
                "detail": str(_import_error),
                "traceback": _error_details[:1000]
            }
        )
    
    @app.get("/api/health")
    async def error_health():
        return {
            "status": "error",
            "message": str(_import_error),
            "traceback": _error_details[:2000]
        }
    
    @app.get("/api/")
    async def error_root():
        return {
            "error": "Application failed to load",
            "detail": str(_import_error),
            "traceback": _error_details[:2000]
        }
