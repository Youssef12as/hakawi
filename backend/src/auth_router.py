import logging
from typing import Optional
import re
import requests
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ForgotPasswordRequest(BaseModel):
    email: str
    redirect_to: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("صيغة البريد الإلكتروني غير صحيحة")
        return clean


class ResetPasswordRequest(BaseModel):
    password: str


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """
    Handle password recovery request by calling Supabase Auth API.
    Sends a password reset email with a magic recovery link to the user.
    """
    email = payload.email.strip().lower()
    redirect_to = payload.redirect_to or "http://localhost:5173/reset-password"

    url = f"{settings.SUPABASE_URL}/auth/v1/recover"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    params = {}
    if redirect_to:
        params["redirect_to"] = redirect_to

    try:
        response = requests.post(
            url,
            headers=headers,
            params=params,
            json={"email": email},
            timeout=10,
        )

        if response.status_code >= 400:
            error_data = {}
            try:
                error_data = response.json()
            except Exception:
                pass

            err_msg = (
                error_data.get("msg")
                or error_data.get("error_description")
                or error_data.get("message")
                or "تعذر إرسال رابط استعادة كلمة المرور"
            )
            logger.warning(f"Supabase recover error for {email}: {err_msg} (status {response.status_code})")

            # Translate common Supabase messages if needed
            if "rate limit" in err_msg.lower() or response.status_code == 429:
                err_msg = "تم تجاوز الحد المسموح به لإرسال الرسائل. يرجى المحاولة بعد قليل."

            raise HTTPException(status_code=response.status_code, detail=err_msg)

        return {
            "status": "ok",
            "message": "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.",
        }

    except HTTPException:
        raise
    except requests.RequestException as e:
        logger.error(f"Network error contacting Supabase Auth for {email}: {e}")
        raise HTTPException(
            status_code=503,
            detail="تعذر الاتصال بخدمة المصادقة حالياً. يرجى المحاولة لاحقاً.",
        )
    except Exception as e:
        logger.error(f"Unexpected error in forgot_password: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.",
        )


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request):
    """
    Handle updating the user's password using their recovery/access token via Supabase Auth API.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="رمز المصادقة أو رابط الاستعادة مفقود أو غير صالح.",
        )

    token = auth_header.split(" ", 1)[1].strip()

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="يجب ألا تقل كلمة المرور عن 6 أحرف.",
        )

    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.put(
            url,
            headers=headers,
            json={"password": payload.password},
            timeout=10,
        )

        if response.status_code >= 400:
            error_data = {}
            try:
                error_data = response.json()
            except Exception:
                pass

            err_msg = (
                error_data.get("msg")
                or error_data.get("error_description")
                or error_data.get("message")
                or "تعذر تحديث كلمة المرور"
            )
            logger.warning(f"Supabase update user error: {err_msg} (status {response.status_code})")
            raise HTTPException(status_code=response.status_code, detail=err_msg)

        return {
            "status": "ok",
            "message": "تم تحديث كلمة المرور بنجاح.",
        }

    except HTTPException:
        raise
    except requests.RequestException as e:
        logger.error(f"Network error contacting Supabase Auth: {e}")
        raise HTTPException(
            status_code=503,
            detail="تعذر الاتصال بخدمة المصادقة حالياً. يرجى المحاولة لاحقاً.",
        )
    except Exception as e:
        logger.error(f"Unexpected error in reset_password: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.",
        )
