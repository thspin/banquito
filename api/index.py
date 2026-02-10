import sys
import os

# Add the backend directory to sys.path so we can import app
# This corresponds to the structure:
# /api/index.py
# /backend/app/main.py
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.main import app

# Vercel will attempt to find 'app' in this module.
