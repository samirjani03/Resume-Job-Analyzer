from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ProviderContext:
    """Resolved AI provider configuration for a single request."""
    provider: str
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    device_id: Optional[str] = None
    temperature: float = 0.1


class LLMProvider(ABC):
    """Abstract base every provider (Ollama local/cloud, Gemini, OpenRouter) implements."""

    id: str = "base"
    label: str = "Base Provider"
    requires_key: bool = True
    requires_base_url: bool = False
    default_models: list = []
    docs_url: str = ""
    key_help: str = ""

    @abstractmethod
    async def complete(self, prompt: str, system_prompt: str, ctx: ProviderContext) -> Optional[str]:
        """Returns raw model output text, or None on failure."""
        raise NotImplementedError
