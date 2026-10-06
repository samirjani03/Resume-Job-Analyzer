import httpx
from typing import Optional
from app.services.providers.base import LLMProvider, ProviderContext


class OpenAICompatibleProvider(LLMProvider):
    """
    Generic OpenAI-style /chat/completions client.
    Subclasses only change base URL, default models and docs links,
    so adding Groq/OpenAI/DeepSeek later is a ~15-line class.
    """

    id = "openai_compat"
    label = "OpenAI-Compatible"
    requires_key = True
    api_base: str = ""

    async def complete(self, prompt: str, system_prompt: str, ctx: ProviderContext) -> Optional[str]:
        if not ctx.api_key:
            return None
        base = (ctx.base_url or self.api_base).rstrip("/")
        url = f"{base}/chat/completions"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": ctx.model,
            "messages": messages,
            "temperature": ctx.temperature,
            "top_p": 0.9,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {ctx.api_key}",
            "Content-Type": "application/json",
        }
        try:
            timeout_config = httpx.Timeout(120.0, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code != 200:
                    print(f"{self.label} Call Note: HTTP {res.status_code} {res.text[:300]}")
                    return None
                data = res.json()
                choices = data.get("choices") or []
                if not choices:
                    return None
                return choices[0].get("message", {}).get("content") or None
        except Exception as e:
            print(f"{self.label} Call Note: {e}")
        return None


class OpenRouterProvider(OpenAICompatibleProvider):
    id = "openrouter"
    label = "OpenRouter"
    api_base = "https://openrouter.ai/api/v1"
    default_models = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-chat-v3-0324:free",
        "google/gemini-2.0-flash-exp:free",
        "qwen/qwen3-30b-a3b:free",
    ]
    docs_url = "https://openrouter.ai/keys"
    key_help = "Free key from OpenRouter. Free models end with ':free'."


class OllamaCloudProvider(OpenAICompatibleProvider):
    """Ollama Cloud — ollama.com as a remote Ollama host (OpenAI-compatible /v1)."""

    id = "ollama_cloud"
    label = "Ollama Cloud"
    api_base = "https://ollama.com/v1"
    default_models = [
        "gpt-oss:120b",
        "deepseek-v4-flash",
        "qwen3.5",
        "glm-5.2",
        "minimax-m3",
    ]
    docs_url = "https://ollama.com/settings/keys"
    key_help = "Create an API key on ollama.com — no local install needed."
