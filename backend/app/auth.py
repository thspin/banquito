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
                if response.status_code != 200:
                    print(f"Auth Error: Could not fetch JWKS from {CLERK_JWKS_URL}. Status: {response.status_code}")
                    raise HTTPException(status_code=500, detail="Failed to fetch auth keys")
                jwks = response.json()
                
            public_key = None
            for key_data in jwks["keys"]:
                if key_data["kid"] == kid:
                    public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
                    break
            
            if not public_key:
                print(f"Auth Error: No matching key found in JWKS for kid: {kid}")
                raise HTTPException(status_code=401, detail="Invalid token key ID")
            key = public_key
        else:
            # Fallback for development/demo (Skip verification if no keys provided)
            if os.environ.get("APP_ENV") == "development":
                 print("Auth Warning: Skipping signature verification (APP_ENV=development)")
                 payload = jwt.decode(token, options={"verify_signature": False})
                 return payload["sub"]
            print("Auth Error: Server auth configuration missing (no PEM or JWKS URL)")
            raise HTTPException(status_code=500, detail="Server auth configuration missing")

        # Prepare verification options
        decode_options = {
            "algorithms": ["RS256"],
        }
        
        # Only verify audience/issuer if specified and NOT empty strings
        audience = os.environ.get("CLERK_AUDIENCE")
        if audience:
            decode_options["audience"] = audience
        
        issuer = CLERK_ISSUER
        if issuer:
            decode_options["issuer"] = issuer

        # Verify the token
        payload = jwt.decode(
            token,
            key=key,
            **decode_options
        )
        
        return payload["sub"]
        
    except jwt.ExpiredSignatureError:
        print("Auth Error: Token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidAudienceError:
        print(f"Auth Error: Invalid audience. Expected: {os.environ.get('CLERK_AUDIENCE')}")
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except jwt.InvalidIssuerError:
        print(f"Auth Error: Invalid issuer. Expected: {CLERK_ISSUER}")
        raise HTTPException(status_code=401, detail="Invalid token issuer")
    except jwt.InvalidTokenError as e:
        print(f"Auth Error: Invalid token: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        import traceback
        print(f"Auth Error: {e}")
        # print(traceback.format_exc()) # Log full traceback to server console
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
