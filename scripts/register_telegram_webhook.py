#!/usr/bin/env python3
"""
Register Telegram bot webhook with Vercel deployment URL.

Usage:
    python scripts/register_telegram_webhook.py

Environment variables required:
    - TELEGRAM_BOT_TOKEN: Your Telegram bot token
    - TELEGRAM_WEBHOOK_URL: Your webhook URL (e.g., https://app.vercel.app/api/telegram/webhook)
    - TELEGRAM_WEBHOOK_SECRET: Optional webhook secret for validation
"""

import os
import sys
import json
import httpx
from pathlib import Path


def load_env():
    """Load environment variables from .env file if it exists."""
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")


def main():
    """Register Telegram webhook."""
    load_env()
    
    # Get environment variables
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL")
    webhook_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    
    # Validate required variables
    if not bot_token:
        print("❌ ERROR: TELEGRAM_BOT_TOKEN not set")
        sys.exit(1)
    
    if not webhook_url:
        print("❌ ERROR: TELEGRAM_WEBHOOK_URL not set")
        print("   Example: https://your-app.vercel.app/api/telegram/webhook")
        sys.exit(1)
    
    # Prepare request
    api_url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
    
    payload = {
        "url": webhook_url,
        "allowed_updates": ["message", "callback_query", "my_chat_member"],
        "drop_pending_updates": False,
    }
    
    # Add secret if provided
    if webhook_secret:
        payload["secret_token"] = webhook_secret
        print(f"📝 Using webhook secret")
    
    # Make request
    print(f"🚀 Registering webhook...")
    print(f"   Bot Token: {bot_token[:20]}...")
    print(f"   Webhook URL: {webhook_url}")
    
    try:
        response = httpx.post(api_url, json=payload)
        result = response.json()
        
        if result.get("ok"):
            print("\n✅ Webhook registered successfully!")
            print(f"\n📊 Webhook Info:")
            print(json.dumps(result.get("result", {}), indent=2))
        else:
            print(f"\n❌ Failed to register webhook:")
            print(json.dumps(result, indent=2))
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Error during webhook registration:")
        print(f"   {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
