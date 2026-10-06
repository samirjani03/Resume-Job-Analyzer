from typing import Dict, List, Optional, Any

from app.config import settings
from app.services.providers.base import LLMProvider, ProviderContext
from app.services.providers.ollama import OllamaProvider
from app.services.providers.gemini import GeminiProvider
from app.services.providers.openai_compat import OpenRouterProvider, OllamaCloudProvider

PROVIDERS: Dict[str, LLMProvider] = {
    "ollama": OllamaProvider(),
    "ollama_cloud": OllamaCloudProvider(),
    "gemini": GeminiProvider(),
    "openrouter": OpenRouterProvider(),
}

DEFAULT_PROVIDER_ID = "ollama"


def get_provider(provider_id: Optional[str]) -> LLMProvider:
    return PROVIDERS.get(provider_id or "", PROVIDERS[DEFAULT_PROVIDER_ID])


def provider_catalog() -> List[Dict[str, Any]]:
    """Provider metadata consumed by the frontend Settings modal."""
    return [
        {
            "id": p.id,
            "label": p.label,
            "requires_key": p.requires_key,
            "requires_base_url": p.requires_base_url,
            "default_models": p.default_models,
            "docs_url": p.docs_url,
            "key_help": p.key_help,
        }
        for p in PROVIDERS.values()
    ]


def default_context(device_id: Optional[str] = None) -> ProviderContext:
    """Local-mode context: exactly the pre-refactor Ollama behavior (config.py driven)."""
    return ProviderContext(
        provider=DEFAULT_PROVIDER_ID,
        model=settings.OLLAMA_MODEL,
        base_url=settings.OLLAMA_BASE_URL,
        api_key=None,
        device_id=device_id,
    )


def resolve_context(db, device_id: Optional[str]) -> ProviderContext:
    """
    Builds the provider context for a request.
    Priority: device's active saved provider -> local Ollama default from config.
    """
    if device_id:
        try:
            from app.models.db_models import ApiKey
            from app.core.security import decrypt_secret

            row = (
                db.query(ApiKey)
                .filter(ApiKey.device_id == device_id, ApiKey.is_active.is_(True))
                .first()
            )
            if row:
                api_key = None
                if row.enc_key:
                    try:
                        api_key = decrypt_secret(row.enc_key)
                    except Exception:
                        api_key = None
                return ProviderContext(
                    provider=row.provider,
                    model=row.model_default or (get_provider(row.provider).default_models or [settings.OLLAMA_MODEL])[0],
                    api_key=api_key,
                    base_url=row.base_url,
                    device_id=device_id,
                )
        except Exception as e:
            print(f"Provider Resolve Note: {e}")

    return default_context(device_id=device_id)
