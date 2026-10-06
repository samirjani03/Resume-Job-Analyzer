from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.deps import get_device_id
from app.core.security import encrypt_secret
from app.models.db_models import ApiKey, UsageLog
from app.services.providers import provider_catalog, PROVIDERS, get_provider, default_context
from app.services.providers.base import ProviderContext

router = APIRouter(prefix="/settings", tags=["Settings"])


class KeyPayload(BaseModel):
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


class KeyResponse(BaseModel):
    provider: str
    label: str
    requires_key: bool
    last4: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    is_active: bool


class ProviderStatus(BaseModel):
    provider: str
    label: str
    model: Optional[str] = None
    last4: Optional[str] = None
    base_url: Optional[str] = None
    configured: bool
    requires_key: bool
    require_provider: bool
    quota_used: int = 0
    quota_limit: int = 20
    quota_resets: Optional[datetime] = None


def _require_device(device_id: Optional[str]) -> str:
    if not device_id:
        raise HTTPException(
            status_code=400,
            detail={"code": "device_required", "message": "Missing X-Device-ID header."},
        )
    return device_id


def _sanitize(row: ApiKey) -> KeyResponse:
    prov = get_provider(row.provider)
    return KeyResponse(
        provider=row.provider,
        label=prov.label,
        requires_key=prov.requires_key,
        last4=row.last4,
        base_url=row.base_url,
        model=row.model_default,
        is_active=row.is_active,
    )


@router.get("/catalog")
def catalog() -> List[Dict[str, Any]]:
    return provider_catalog()


@router.get("/status", response_model=ProviderStatus)
def status(
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    row = None
    if device_id:
        row = (
            db.query(ApiKey)
            .filter(ApiKey.device_id == device_id, ApiKey.is_active.is_(True))
            .first()
        )

    used = 0
    if device_id:
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        used = (
            db.query(UsageLog)
            .filter(UsageLog.device_id == device_id, UsageLog.created_at >= day_start)
            .count()
        )

    if row:
        prov = get_provider(row.provider)
        status_res = ProviderStatus(
            provider=row.provider,
            label=prov.label,
            model=row.model_default,
            last4=row.last4,
            base_url=row.base_url,
            configured=True,
            requires_key=prov.requires_key,
            require_provider=settings.REQUIRE_PROVIDER,
            quota_used=used,
            quota_limit=settings.DAILY_QUOTA,
        )
    else:
        dep = default_context()
        prov = get_provider(dep.provider)
        status_res = ProviderStatus(
            provider=dep.provider,
            label=prov.label,
            model=dep.model,
            base_url=dep.base_url,
            configured=not settings.REQUIRE_PROVIDER,
            requires_key=prov.requires_key,
            require_provider=settings.REQUIRE_PROVIDER,
            quota_used=used,
            quota_limit=settings.DAILY_QUOTA,
        )

    from datetime import timedelta

    status_res.quota_resets = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return status_res


@router.post("/keys", response_model=KeyResponse)
def save_key(
    payload: KeyPayload,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    device = _require_device(device_id)
    if payload.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider '{payload.provider}'.")

    prov = get_provider(payload.provider)

    enc_key = None
    last4 = None
    existing = (
        db.query(ApiKey)
        .filter(ApiKey.device_id == device, ApiKey.provider == payload.provider)
        .first()
    )

    if prov.requires_key:
        api_key = (payload.api_key or "").strip()
        if api_key:
            enc_key = encrypt_secret(api_key)
            last4 = api_key[-4:] if len(api_key) >= 4 else api_key
        elif existing and existing.enc_key:
            enc_key = existing.enc_key
            last4 = existing.last4
        else:
            raise HTTPException(status_code=400, detail="An API key is required for this provider.")

    base_url = (payload.base_url or "").strip() or None
    model = (payload.model or "").strip() or None
    if not model:
        model = (prov.default_models or [settings.OLLAMA_MODEL])[0]

    # Deactivate all prior rows for this device, then upsert the selected provider
    db.query(ApiKey).filter(ApiKey.device_id == device).update(
        {ApiKey.is_active: False}, synchronize_session=False
    )

    row = existing
    if row:
        row.enc_key = enc_key if enc_key is not None else row.enc_key
        row.base_url = base_url
        row.model_default = model
        row.last4 = last4 if last4 is not None else row.last4
        row.is_active = True
    else:
        row = ApiKey(
            device_id=device,
            provider=payload.provider,
            enc_key=enc_key,
            base_url=base_url,
            model_default=model,
            last4=last4,
            is_active=True,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _sanitize(row)


@router.delete("/keys/{provider}")
def delete_key(
    provider: str,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    device = _require_device(device_id)
    row = (
        db.query(ApiKey)
        .filter(ApiKey.device_id == device, ApiKey.provider == provider)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.post("/keys/test")
async def test_key(
    payload: KeyPayload,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    if payload.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider '{payload.provider}'.")

    prov = get_provider(payload.provider)
    api_key = (payload.api_key or "").strip() or None
    base_url = (payload.base_url or "").strip() or None
    model = (payload.model or "").strip() or None or (prov.default_models or [settings.OLLAMA_MODEL])[0]

    if prov.requires_key and api_key is None:
        # Reuse the device's stored key so "Test" works without re-pasting.
        stored = (
            db.query(ApiKey)
            .filter(ApiKey.device_id == device_id, ApiKey.provider == payload.provider)
            .first()
        )
        if stored and stored.enc_key:
            from app.core.security import decrypt_secret

            api_key = decrypt_secret(stored.enc_key)
        if not api_key:
            raise HTTPException(status_code=400, detail="An API key is required for this provider.")

    ctx = ProviderContext(
        provider=payload.provider,
        model=model,
        api_key=api_key,
        base_url=base_url,
    )
    try:
        reply = await prov.complete(
            "Reply with exactly: OK",
            "You are a connectivity tester.",
            ctx,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail={"code": "test_failed", "message": str(e)})

    if reply is None:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "test_failed",
                "message": "Provider rejected the request. Check the key/model — see console for details.",
            },
        )
    return {"ok": True, "model": model, "reply": reply[:200]}


@router.get("/quota")
def quota(
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    used = 0
    if device_id:
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        used = (
            db.query(UsageLog)
            .filter(UsageLog.device_id == device_id, UsageLog.created_at >= day_start)
            .count()
        )
    from datetime import timedelta

    return {
        "used": used,
        "limit": settings.DAILY_QUOTA,
        "resets_at": datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1),
    }