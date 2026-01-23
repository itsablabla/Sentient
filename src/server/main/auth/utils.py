import os
import json
import logging
from typing import Optional, Dict, List, Tuple

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import base64

from fastapi import HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer
from json_extractor import JsonExtractor

from main.config import (
    ENVIRONMENT, SELF_HOST_AUTH_SECRET,
    AES_SECRET_KEY, AES_IV
)

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthHelper:
    async def _validate_token_and_get_payload(self, token: str) -> dict:
        # In self-hosted mode, we only check against the shared secret.
        if not SELF_HOST_AUTH_SECRET:
            logger.critical("SELF_HOST_AUTH_SECRET is not set in environment.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Server configuration error: Authentication secret missing."
            )
        
        if token != SELF_HOST_AUTH_SECRET:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Return a static payload for the single user
        return {
            "sub": "sentient-user",
            "name": "Sentient Admin",
            "email": "admin@selfhost",
            "permissions": [], # Admin has all implicit permissions
            "plan": "selfhost"
        }

    async def get_current_user_id_plan_and_permissions(self, token: str = Depends(oauth2_scheme)) -> Tuple[str, str, List[str]]:
        payload = await self._validate_token_and_get_payload(token)
        return payload["sub"], payload["plan"], payload["permissions"]

    async def get_current_user_id(self, token: str = Depends(oauth2_scheme)) -> str:
        payload = await self._validate_token_and_get_payload(token)
        return payload["sub"]
    
    async def get_decoded_payload_with_claims(self, token: str = Depends(oauth2_scheme)) -> dict:
        payload = await self._validate_token_and_get_payload(token)
        payload["user_id"] = payload["sub"]
        return payload

    async def ws_authenticate_with_data(self, websocket: WebSocket) -> Optional[Dict]:
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

            # Add other data from the auth message to the return dict
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
            except: pass
            return None

    async def ws_authenticate(self, websocket: WebSocket) -> Optional[str]:
        auth_data = await self.ws_authenticate_with_data(websocket)
        return auth_data.get("user_id") if auth_data else None

    async def get_current_user_id_and_plan(self, token: str = Depends(oauth2_scheme)) -> Tuple[str, str]:
        payload = await self._validate_token_and_get_payload(token)
        return payload["sub"], payload["plan"]

class PermissionChecker:
    def __init__(self, required_permissions: List[str]):
        pass # Permissions are implicit in self-hosted mode

    async def __call__(self, token: str = Depends(oauth2_scheme)):
        auth_helper = AuthHelper()
        user_id = await auth_helper.get_current_user_id(token)
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

# --- Deprecated Auth0 Helpers (Stubs) ---
def get_management_token() -> str:
    # Stub: Should not be called in self-hosted flow
    raise NotImplementedError("Auth0 Management API not supported in self-hosted mode.")
