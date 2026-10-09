from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "swastik-hospital-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Bcrypt only accepts passwords up to 72 bytes
BCRYPT_MAX_PASSWORD_BYTES = 72


def _truncate_password_bytes(password: str) -> bytes:
    """Truncate password to 72 bytes (bcrypt limit) to avoid ValueError."""
    encoded = password.encode("utf-8")
    if len(encoded) > BCRYPT_MAX_PASSWORD_BYTES:
        encoded = encoded[:BCRYPT_MAX_PASSWORD_BYTES]
    return encoded


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        secret = _truncate_password_bytes(plain_password)
        return bcrypt.checkpw(secret, hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    secret = _truncate_password_bytes(password)
    return bcrypt.hashpw(secret, bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
