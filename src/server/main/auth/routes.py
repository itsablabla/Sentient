# src/server/main/auth/routes.py
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from main.auth.utils import aes_encrypt, aes_decrypt, PermissionChecker
from main.auth.models import AuthTokenStoreRequest, EncryptionRequest, DecryptionRequest
from main.dependencies import mongo_manager, auth_helper
from main.config import INTEGRATIONS_CONFIG

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication & Authorization"]
)

@router.post("/store_session")
async def store_session_tokens(
    request: AuthTokenStoreRequest,
    user_id: str = Depends(auth_helper.get_current_user_id) 
):
    logger.info(f"Storing refresh token for user {user_id}")
    try:
        encrypted_refresh_token = aes_encrypt(request.refresh_token)
        update_payload = {"userData.encrypted_refresh_token": encrypted_refresh_token}
        success = await mongo_manager.update_user_profile(user_id, update_payload)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store refresh token.")
        return JSONResponse(content={"message": "Session tokens stored securely."})
    except Exception as e:
        logger.error(f"Error storing session for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error storing session: {str(e)}")

@router.post("/utils/encrypt", summary="Encrypt Data (AES)")
async def encrypt_data_endpoint(request: EncryptionRequest):
    return JSONResponse(content={"encrypted_data": aes_encrypt(request.data)})

@router.post("/utils/decrypt", summary="Decrypt Data (AES)")
async def decrypt_data_endpoint(request: DecryptionRequest):
    try:
        return JSONResponse(content={"decrypted_data": aes_decrypt(request.encrypted_data)})
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Decryption failed: {str(ve)}")
    except Exception as e:
        logger.error(f"Unexpected error during AES decryption: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during decryption.")