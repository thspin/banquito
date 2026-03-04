import sys
import os
import json
from datetime import datetime

async def handler(request):
    """Health check and diagnostics endpoint for monitoring."""
    
    diagnostics = {
        "timestamp": datetime.utcnow().isoformat(),
        "status": "healthy",
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "environment": {
            "DATABASE_URL_SET": bool(os.getenv("DATABASE_URL")),
            "TELEGRAM_BOT_TOKEN_SET": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
            "TELEGRAM_WEBHOOK_URL_SET": bool(os.getenv("TELEGRAM_WEBHOOK_URL")),
            "APP_ENV": os.getenv("APP_ENV", "production"),
        },
        "paths": {
            "current_dir": os.getcwd(),
            "python_path": sys.path[:3],  # First 3 paths only
        }
    }
    
    # Check if main app can be imported
    try:
        backend_path = os.path.join(os.path.dirname(__file__), '../backend')
        sys.path.insert(0, backend_path)
        from app.main import app as main_app
        diagnostics["app_loaded"] = True
        diagnostics["app_routes"] = len(main_app.routes)
    except Exception as e:
        diagnostics["status"] = "warning"
        diagnostics["app_loaded"] = False
        diagnostics["app_error"] = str(e)
    
    return {
        "statusCode": 200,
        "body": json.dumps(diagnostics),
        "headers": {
            "Content-Type": "application/json"
        }
    }
