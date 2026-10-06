import httpx
from typing import Optional
from app.services.providers.base import LLMProvider, ProviderContext


class GeminiProvider(LLMProvider):
    """Google Gemini REST API (generativelanguage.googleapis.com)."""

    id = "gemini"
    label = "Google Gemini"
    requires_key = True
    default_models = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
    ]
    docs_url = "https://aistudio.google.com/apikey"
    key_help = "Free key from Google AI Studio. Paste it below."

    async def complete(self, prompt: str, system_prompt: str, ctx: ProviderContext) -> Optional[str]:
        if not ctx.api_key:
            return None
        model = ctx.model or self.default_models[0]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": ctx.temperature,
                "topP": 0.9,
            },
        }
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        headers = {"x-goog-api-key": ctx.api_key}
        try:
            timeout_config = httpx.Timeout(120.0, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code != 200:
                    print(f"Gemini Call Note: HTTP {res.status_code} {res.text[:300]}")
                    return None
                data = res.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    return None
                parts = candidates[0].get("content", {}).get("parts", [])
                texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
                return "".join(texts) or None
        except Exception as e:
            print(f"Gemini Call Note: {e}")
        return None
