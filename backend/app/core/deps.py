import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.providers import resolve_context, PROVIDERS, ProviderContext


def get_device_id(request: Request) -> Optional[str]:
    """Validates the anonymous X-Device-ID header; returns None if absent/malformed."""
    raw = request.headers.get("X-Device-ID", "").strip()
    if not raw:
        return None
    try:
        uuid.UUID(raw)
        return raw
    except ValueError:
        return None


def ensure_provider_ready(
    request: Request,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
) -> Optional[str]:
    """
    Hosted mode (REQUIRE_PROVIDER=True): 401 provider_required until the device
    has a usable saved provider. Local mode: always passes (legacy behavior).
    """
    if not settings.REQUIRE_PROVIDER:
        return device_id

    if not device_id:
        raise HTTPException(
            status_code=401,
            detail={"code": "provider_required", "message": "Open Settings and choose an AI provider."},
        )

    from app.models.db_models import ApiKey

    row = (
        db.query(ApiKey)
        .filter(ApiKey.device_id == device_id, ApiKey.is_active.is_(True))
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=401,
            detail={"code": "provider_required", "message": "Open Settings and choose an AI provider."},
        )

    provider = PROVIDERS.get(row.provider)
    if provider is None or (provider.requires_key and not row.enc_key):
        raise HTTPException(
            status_code=401,
            detail={"code": "provider_required", "message": "Saved provider is missing its API key."},
        )
    return device_id


def enforce_quota(
    request: Request,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
) -> None:
    """Blocks LLM endpoints past the daily limit (hosted mode only, per device)."""
    if not settings.REQUIRE_PROVIDER or not device_id:
        return

    from app.models.db_models import UsageLog

    day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    used = (
        db.query(UsageLog)
        .filter(UsageLog.device_id == device_id, UsageLog.created_at >= day_start)
        .count()
    )
    if used >= settings.DAILY_QUOTA:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "quota_exceeded",
                "message": f"Daily limit of {settings.DAILY_QUOTA} analyses reached. Resets at midnight UTC.",
                "used": used,
                "limit": settings.DAILY_QUOTA,
            },
        )


def provider_context(
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
    _ready: Optional[str] = Depends(ensure_provider_ready),
) -> ProviderContext:
    """Resolved provider configuration passed into llm_analyzer for this request."""
    return resolve_context(db, device_id)
