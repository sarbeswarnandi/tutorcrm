import os
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "tutor-crm-secret-key-super-secure-change-in-prod-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Master admin credentials setup
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin").strip()
ADMIN_PHONE = os.getenv("ADMIN_PHONE", "9876543210").strip()
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "teacher@tutorcrm.com").strip()
ADMIN_PASSWORD_PLAIN = os.getenv("ADMIN_PASSWORD", "Coach1234")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")

def verify_master_password(plain_password: str) -> bool:
    """Verifies password against hash if configured, or plain text fallback."""
    if ADMIN_PASSWORD_HASH:
        try:
            return pwd_context.verify(plain_password, ADMIN_PASSWORD_HASH)
        except Exception:
            pass
    return plain_password == ADMIN_PASSWORD_PLAIN

def verify_credentials(identifier: str, plain_password: str) -> bool:
    """
    Verifies user credentials.
    Identifier can be:
    - Username (default: 'admin')
    - 10-digit mobile number (default: '9876543210' or digits match)
    - Email (default: 'teacher@tutorcrm.com' or 'sharma.maths@okaxis')
    """
    clean_id = (identifier or "").strip().lower()
    clean_digits = "".join(filter(str.isdigit, identifier or ""))

    valid_id = False
    # Username check
    if clean_id == ADMIN_USERNAME.lower() or clean_id in ("tutor", "teacher", "coach", "admin"):
        valid_id = True
    # Email check
    elif clean_id in (ADMIN_EMAIL.lower(), "sharma.maths@okaxis", "admin@tutorcrm.com"):
        valid_id = True
    # Mobile check (10 digits)
    elif clean_digits and (clean_digits == ADMIN_PHONE or clean_digits.endswith(ADMIN_PHONE)):
        valid_id = True

    if not valid_id:
        return False

    return verify_master_password(plain_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def verify_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Validates JWT token from:
    1. Authorization: Bearer <token>
    2. Cookie 'tutor_token' (enables seamless CSV downloads & browser viewing)
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif "tutor_token" in request.cookies:
        token = request.cookies.get("tutor_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
