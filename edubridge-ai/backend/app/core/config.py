"""EduBridge AI — Core Configuration"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./edubridge.db"

    # ── IBM Granite ───────────────────────────────────────────────────────────
    GRANITE_API_URL: str = ""
    GRANITE_API_KEY: str = ""
    GRANITE_MODEL_ID: str = "ibm/granite-3-8b-instruct"
    GRANITE_PROJECT_ID: str = ""

    # ── LLM Provider ─────────────────────────────────────────────────────────
    LLM_PROVIDER: str = "granite"
    ALLOW_DEVELOPMENT_FALLBACK: bool = False

    # ── Embedding ─────────────────────────────────────────────────────────────
    EMBEDDING_MODEL: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    # ── Vector Store ──────────────────────────────────────────────────────────
    VECTOR_STORE_PATH: str = "./storage/vector_store"
    VECTOR_STORE_TYPE: str = "faiss"

    # ── File Storage ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./storage/uploads"
    MAX_UPLOAD_MB: int = 20

    # ── Retrieval ─────────────────────────────────────────────────────────────
    RETRIEVAL_TOP_K: int = 5
    RETRIEVAL_SCORE_THRESHOLD: float = 0.3

    # ── Auth ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-this-secret"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def granite_configured(self) -> bool:
        return bool(self.GRANITE_API_URL and self.GRANITE_API_KEY)

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
