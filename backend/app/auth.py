import os
import httpx
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt.algorithms import RSAAlgorithm
import json
from functools import lru_cache

# Configuration
CLERK_PEM_PUBLIC_KEY = os.environ.get("CLERK_PEM_PUBLIC_KEY")
CLERK_ISSUER = os.environ.get("CLERK_ISSUER")
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL")

security = HTTPBearer()

@lru_cache()
def get_jwks_client():
    return httpx.Client()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    Verifies the Clerk JWT and returns the user ID.
    """
    token = credentials.credentials
    
    try:
        # Decode headers to get the key ID
        unverified_headers = jwt.get_unverified_header(token)
        kid = unverified_headers.get("kid")
        
        # Method 1: Use PEM Public Key (Fastest if provided)
        if CLERK_PEM_PUBLIC_KEY:
            key = CLERK_PEM_PUBLIC_KEY
        
        # Method 2: Fetch from JWKS (Resilient)
        elif CLERK_JWKS_URL:
            # Note: In production, you should cache this!
            async with httpx.AsyncClient() as client:
                response = await client.get(CLERK_JWKS_URL)
                jwks = response.json()
                
            public_key = None
            for key_data in jwks["keys"]:
                if key_data["kid"] == kid:
                    public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
                    break
            
            if not public_key:
                raise HTTPException(status_code=401, detail="Invalid token key ID")
            key = public_key
        else:
            # Fallback for development/demo (Skip verification if no keys provided)
            # WARNING: NOT FOR PRODUCTION
            if os.environ.get("APP_ENV") == "development":
                 payload = jwt.decode(token, options={"verify_signature": False})
                 return payload["sub"]
            raise HTTPException(status_code=500, detail="Server auth configuration missing")

        # Verify the token
        payload = jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=os.environ.get("CLERK_AUDIENCE"), # Optional
            issuer=CLERK_ISSUER # Optional but recommended
        )
        
        return payload["sub"]
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
