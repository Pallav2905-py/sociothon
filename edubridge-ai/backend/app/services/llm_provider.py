"""EduBridge AI — LLM Provider Abstraction"""
from abc import ABC, abstractmethod
from typing import Optional
from loguru import logger
from app.core.config import get_settings

settings = get_settings()


class LLMProvider(ABC):
    """Abstract base for all LLM providers."""

    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass


class GraniteProvider(LLMProvider):
    """
    IBM Granite provider via watsonx.ai inference endpoint.
    Requires: GRANITE_API_URL, GRANITE_API_KEY, GRANITE_MODEL_ID, GRANITE_PROJECT_ID
    """

    def __init__(self):
        self._validate_config()

    def _validate_config(self):
        if not settings.GRANITE_API_URL:
            raise RuntimeError("GRANITE_API_URL not configured")
        if not settings.GRANITE_API_KEY:
            raise RuntimeError("GRANITE_API_KEY not configured")

    @property
    def provider_name(self) -> str:
        return f"IBM Granite ({settings.GRANITE_MODEL_ID})"

    def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        import httpx

        # watsonx.ai text generation endpoint
        url = f"{settings.GRANITE_API_URL.rstrip('/')}/ml/v1/text/generation?version=2024-05-01"

        headers = {
            "Authorization": f"Bearer {settings.GRANITE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Build prompt in chat format for Granite instruct models
        full_prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_message}\n<|assistant|>\n"

        payload = {
            "model_id": settings.GRANITE_MODEL_ID,
            "input": full_prompt,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "stop_sequences": ["<|user|>", "<|system|>"],
            },
        }

        if settings.GRANITE_PROJECT_ID:
            payload["project_id"] = settings.GRANITE_PROJECT_ID

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                if results:
                    return results[0].get("generated_text", "").strip()
                raise RuntimeError(f"Unexpected Granite response: {data}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Granite HTTP error {e.response.status_code}: {e.response.text}")
            raise RuntimeError(f"Granite API error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Granite generation failed: {e}")
            raise RuntimeError(f"Granite generation failed: {e}")


class DevelopmentFallbackProvider(LLMProvider):
    """
    A clearly-labelled development fallback provider.
    Returns structured template responses when Granite is not configured.
    NEVER claims to be IBM Granite.
    Only active when ALLOW_DEVELOPMENT_FALLBACK=true.
    """

    @property
    def provider_name(self) -> str:
        return "Development Fallback (NOT IBM Granite)"

    def generate(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """
        Returns a structured template response for UI testing.
        Clearly marked as development output.
        """
        logger.warning(
            "⚠️  Using DevelopmentFallbackProvider — NOT a real LLM. "
            "Configure GRANITE_API_KEY for real responses."
        )

        # Extract language hint from system prompt
        if "मराठी" in system_prompt or "Marathi" in system_prompt:
            return self._marathi_template(user_message)
        elif "हिंदी" in system_prompt or "Hindi" in system_prompt:
            return self._hindi_template(user_message)
        else:
            return self._english_template(user_message)

    def _english_template(self, question: str) -> str:
        return f"""[⚠️ Development Mode — IBM Granite not configured]

**Your Question:** {question[:100]}...

This is a placeholder response from the development fallback provider. 

To get real AI-generated answers:
1. Configure your IBM Granite API credentials in the `.env` file
2. Set `GRANITE_API_URL`, `GRANITE_API_KEY`, and `GRANITE_MODEL_ID`
3. Set `LLM_PROVIDER=granite`
4. Restart the backend server

**Key Points from the uploaded document would appear here.**

*Source references would be shown below.*"""

    def _marathi_template(self, question: str) -> str:
        return f"""[⚠️ विकास मोड — IBM Granite कॉन्फिगर केलेले नाही]

**तुमचा प्रश्न:** {question[:100]}

हे IBM Granite AI चे खरे उत्तर नाही. हे एक विकास-मोड प्लेसहोल्डर आहे.

खरे AI उत्तर मिळवण्यासाठी, `.env` फाइलमध्ये IBM Granite API तपशील भरा:
- `GRANITE_API_URL`
- `GRANITE_API_KEY`  
- `GRANITE_MODEL_ID`

*स्रोत संदर्भ येथे दिसतील.*"""

    def _hindi_template(self, question: str) -> str:
        return f"""[⚠️ विकास मोड — IBM Granite कॉन्फ़िगर नहीं किया गया]

**आपका प्रश्न:** {question[:100]}

यह IBM Granite AI का वास्तविक उत्तर नहीं है। यह एक development placeholder है।

वास्तविक AI उत्तर पाने के लिए `.env` फ़ाइल में IBM Granite API विवरण भरें।

*स्रोत संदर्भ यहाँ दिखाई देंगे।*"""


def get_llm_provider() -> LLMProvider:
    """
    Factory function — returns the configured LLM provider.
    Never silently switches providers.
    """
    if settings.LLM_PROVIDER == "granite":
        if settings.granite_configured:
            logger.info("Using IBM Granite provider")
            return GraniteProvider()
        else:
            if settings.ALLOW_DEVELOPMENT_FALLBACK:
                logger.warning(
                    "⚠️  Granite not configured. Using DevelopmentFallbackProvider "
                    "(ALLOW_DEVELOPMENT_FALLBACK=true)"
                )
                return DevelopmentFallbackProvider()
            else:
                raise RuntimeError(
                    "IBM Granite credentials not configured. "
                    "Set GRANITE_API_URL, GRANITE_API_KEY in .env. "
                    "Or set ALLOW_DEVELOPMENT_FALLBACK=true for development."
                )
    elif settings.LLM_PROVIDER == "development":
        if settings.ALLOW_DEVELOPMENT_FALLBACK:
            return DevelopmentFallbackProvider()
        raise RuntimeError("ALLOW_DEVELOPMENT_FALLBACK must be true to use development provider")
    else:
        raise RuntimeError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")
