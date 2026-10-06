import httpx
from typing import Optional
from app.services.providers.base import LLMProvider, ProviderContext


class OllamaProvider(LLMProvider):
    """
    Native Ollama /api/generate API.
    Works for a local daemon (http://localhost:11434, no key)
    and for Ollama Cloud (https://ollama.com, Bearer API key).
    """

    id = "ollama"
    label = "Ollama (Local / Custom URL)"
    requires_key = False
    requires_base_url = True
    default_models = ["qwen2.5:latest", "llama3.3", "deepseek-r1:8b", "gemma4"]
    docs_url = "https://ollama.com/download"
    key_help = "No API key needed. Runs on your own machine via Ollama."

    async def complete(self, prompt: str, system_prompt: str, ctx: ProviderContext) -> Optional[str]:
        base_url = (ctx.base_url or "http://localhost:11434").rstrip("/")
        payload = {
            "model": ctx.model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": ctx.temperature,
                "top_p": 0.9
            }
        }
        headers = {}
        if ctx.api_key:
            headers["Authorization"] = f"Bearer {ctx.api_key}"
        try:
            timeout_config = httpx.Timeout(120.0, connect=5.0)
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                res = await client.post(f"{base_url}/api/generate", json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "")
        except Exception as e:
            print(f"Ollama Call Note: {e}")
        return None
