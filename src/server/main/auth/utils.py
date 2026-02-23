import os
import logging
import httpx
from typing import Optional, List, Tuple

from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from fastapi import HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer
from json_extractor import JsonExtractor

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import base64

from main.config import (
    ENVIRONMENT, SELF_HOST_AUTH_SECRET,
    AES_SECRET_KEY, AES_IV,
    SUPABASE_JWT_SECRET, ALGORITHMS,
    SUPABASE_URL
)

# All app permissions. Supabase auth does not use Auth0-style scopes; any valid user gets full access.
ALL_APP_PERMISSIONS = [
    "read:chat", "write:chat", "read:profile", "write:profile",
    "read:config", "write:config", "read:tasks", "write:tasks",
    "read:notifications", "write:notifications", "read:memory", "write:memory",
]

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Cache for JWKS keys (fetched once at first use)
_jwks_cache: Optional[dict] = None


def _get_jwks_keys() -> dict:
    """Fetch and cache JWKS keys from Supabase for ES256 token verification."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    
    if not SUPABASE_URL:
        logger.warning("SUPABASE_URL not set, cannot fetch JWKS keys")
        return {"keys": []}
    
    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(jwks_url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        print(f"[AUTH] Fetched JWKS keys from {jwks_url}: {len(_jwks_cache.get('keys', []))} key(s)")
        return _jwks_cache
    except Exception as e:
        logger.error(f"Failed to fetch JWKS keys from {jwks_url}: {e}")
        return {"keys": []}


def _ensure_supabase_permissions(payload: dict) -> None:
    """Supabase JWTs do not include Auth0-style permissions. Grant full app permissions to any valid user."""
    if not payload.get("permissions"):
        payload["permissions"] = list(ALL_APP_PERMISSIONS)


class AuthHelper:
    async def _validate_token_and_get_payload(self, token: str) -> dict:
        # --- Selfhost mode: static token ---
        if ENVIRONMENT == "selfhost":
            if not SELF_HOST_AUTH_SECRET:
                logger.critical("selfhost mode is active but SELF_HOST_AUTH_SECRET is not set.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Self-host auth secret not configured.")
            if token == SELF_HOST_AUTH_SECRET:
                return {
                    "sub": "self-hosted-user",
                    "permissions": ALL_APP_PERMISSIONS,
                    "email": "selfhost@example.com"
                }
            else:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid self-host token")

        # --- Supabase JWT validation ---
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"},
        )
        
        # Decode header to determine algorithm
        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg", "HS256")
            kid = unverified_header.get("kid")
            print(f"[AUTH] Token alg={alg}, kid={kid}")
        except Exception as e:
            print(f"[AUTH] Failed to decode token header: {e}")
            raise credentials_exception

        try:
            if alg == "ES256":
                # ES256: verify using JWKS public key from Supabase
                jwks = _get_jwks_keys()
                matching_keys = [k for k in jwks.get("keys", []) if k.get("kid") == kid]
                if not matching_keys:
                    # Try any ES256 key if kid doesn't match
                    matching_keys = [k for k in jwks.get("keys", []) if k.get("alg") == "ES256"]
                
                if not matching_keys:
                    print(f"[AUTH] No matching JWKS key found for kid={kid}")
                    raise credentials_exception
                
                key = matching_keys[0]
                payload = jwt.decode(
                    token,
                    key,
                    algorithms=["ES256"],
                    options={"verify_aud": False}
                )
                print(f"[AUTH] JWT validation SUCCESS (ES256). sub={payload.get('sub')}")
                _ensure_supabase_permissions(payload)
                return payload
            else:
                # HS256: verify using JWT secret
                if not SUPABASE_JWT_SECRET:
                    logger.error("SUPABASE_JWT_SECRET not available for HS256 token validation.")
                    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service config error (JWT secret).")
                
                payload = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                print(f"[AUTH] JWT validation SUCCESS (HS256). sub={payload.get('sub')}")
                _ensure_supabase_permissions(payload)
                return payload
        except JWTError as e:
            print(f"[AUTH] JWT validation FAILED ({alg}): {e}")
            logger.warning(f"JWT validation error: {e}")
            raise credentials_exception

    async def get_current_user_id_plan_and_permissions(self, token: str = Depends(oauth2_scheme)) -> Tuple[str, str, List[str]]:
        payload = await self._validate_token_and_get_payload(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID (sub) not in token")

        permissions = payload.get("permissions", [])

        # Determine plan
        plan = "free"
        if ENVIRONMENT == "selfhost":
            plan = "selfhost"
        else:
            # Supabase: check app_metadata or user_metadata for role
            app_metadata = payload.get("app_metadata", {})
            user_role = app_metadata.get("role", "")
            if user_role == "pro" or "Pro" in payload.get("user_metadata", {}).get("roles", []):
                plan = "pro"

        return user_id, plan, permissions

    async def get_current_user_id(self, token: str = Depends(oauth2_scheme)) -> str:
        user_id, _, _ = await self.get_current_user_id_plan_and_permissions(token=token)
        return user_id

    async def get_decoded_payload_with_claims(self, token: str = Depends(oauth2_scheme)) -> dict:
        payload = await self._validate_token_and_get_payload(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID (sub) not in token")
        payload["user_id"] = user_id

        # Add plan to payload for easy access
        plan = "free"
        if ENVIRONMENT == "selfhost":
            plan = "selfhost"
        else:
            app_metadata = payload.get("app_metadata", {})
            if app_metadata.get("role") == "pro":
                plan = "pro"
        payload["plan"] = plan

        # Supabase includes email at the top level
        payload["email"] = payload.get("email")

        return payload

    async def ws_authenticate_with_data(self, websocket: WebSocket) -> Optional[dict]:
        try:
            auth_message_str = await websocket.receive_text()
            auth_message = JsonExtractor.extract_valid_json(auth_message_str)

            if not auth_message or not isinstance(auth_message, dict) or auth_message.get("type") != "auth" or not auth_message.get("token"):
                await websocket.send_json({"type": "auth_failure", "message": "Invalid auth message format."})
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None

            token = auth_message["token"]
            payload = await self._validate_token_and_get_payload(token)
            user_id = payload.get("sub")

            if not user_id:
                await websocket.send_json({"type": "auth_failure", "message": "User ID not found in token."})
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return None

            auth_data = {
                "user_id": user_id,
                **{k: v for k, v in auth_message.items() if k not in ["type", "token"]}
            }

            await websocket.send_json({"type": "auth_success", "user_id": user_id})
            return auth_data
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected during authentication.")
            return None
        except HTTPException as e:
            await websocket.send_json({"type": "auth_failure", "message": f"Token validation failed: {e.detail}"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        except Exception as e:
            logger.error(f"Unexpected error during WebSocket authentication: {e}", exc_info=True)
            try:
                await websocket.send_json({"type": "auth_failure", "message": "Internal server error during auth."})
                await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except:
                pass
            return None

    async def ws_authenticate(self, websocket: WebSocket) -> Optional[str]:
        auth_data = await self.ws_authenticate_with_data(websocket)
        return auth_data.get("user_id") if auth_data else None

    async def get_current_user_id_and_plan(self, token: str = Depends(oauth2_scheme)) -> Tuple[str, str]:
        user_id, plan, _ = await self.get_current_user_id_plan_and_permissions(token=token)
        return user_id, plan


class PermissionChecker:
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = set(required_permissions)

    async def __call__(self, token: str = Depends(oauth2_scheme)):
        from main.dependencies import auth_helper
        user_id, _, token_permissions_list = await auth_helper.get_current_user_id_plan_and_permissions(token=token)
        token_permissions_set = set(token_permissions_list)

        if not self.required_permissions.issubset(token_permissions_set):
            missing = self.required_permissions - token_permissions_set
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Missing permissions: {', '.join(missing)}")
        return user_id


# --- AES Encryption/Decryption ---
def aes_encrypt(data: str) -> str:
    if not AES_SECRET_KEY or not AES_IV:
        raise ValueError("AES encryption keys are not configured.")
    backend = default_backend()
    cipher = Cipher(algorithms.AES(AES_SECRET_KEY), modes.CBC(AES_IV), backend=backend)
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(data.encode()) + padder.finalize()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(encrypted).decode()


def aes_decrypt(encrypted_data: str) -> str:
    if not AES_SECRET_KEY or not AES_IV:
        raise ValueError("AES encryption keys are not configured.")
    backend = default_backend()
    cipher = Cipher(algorithms.AES(AES_SECRET_KEY), modes.CBC(AES_IV), backend=backend)
    decryptor = cipher.decryptor()
    encrypted_bytes = base64.b64decode(encrypted_data)
    decrypted = decryptor.update(encrypted_bytes) + decryptor.finalize()
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    unpadded_data = unpadder.update(decrypted) + unpadder.finalize()
    return unpadded_data.decode()