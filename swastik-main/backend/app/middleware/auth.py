from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.auth import decode_token

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def require_role(roles: list[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        print(f"DEBUG: User Role: '{user_role}', Allowed: {roles}")
        if not user_role or user_role not in roles:
            print(f"DEBUG: Role check failed for user {current_user.get('sub')}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
    return role_checker
