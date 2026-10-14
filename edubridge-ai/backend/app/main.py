"""EduBridge AI — FastAPI Application Entry Point"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from loguru import logger

from app.core.config import get_settings
from app.database.session import init_db
from app.api import auth, documents, chat, learning

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("🚀 EduBridge AI Backend starting up...")

    # Initialise database
    init_db()
    logger.info("✅ Database initialised")

    # Validate configuration
    if not settings.granite_configured:
        if settings.ALLOW_DEVELOPMENT_FALLBACK:
            logger.warning(
                "⚠️  IBM Granite not configured. "
                "Using DevelopmentFallbackProvider (ALLOW_DEVELOPMENT_FALLBACK=true). "
                "This is NOT suitable for production."
            )
        else:
            logger.error(
                "❌ IBM Granite credentials missing and ALLOW_DEVELOPMENT_FALLBACK=false. "
                "Set GRANITE_API_URL, GRANITE_API_KEY in .env or enable development fallback."
            )

    # Ensure storage directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.VECTOR_STORE_PATH, exist_ok=True)
    logger.info("✅ Storage directories ready")

    logger.info(f"✅ EduBridge AI ready at http://localhost:8000")
    logger.info(f"   Docs: http://localhost:8000/docs")
    logger.info(f"   LLM Provider: {settings.LLM_PROVIDER}")

    yield

    logger.info("EduBridge AI shutting down...")


app = FastAPI(
    title="EduBridge AI API",
    description="Multilingual AI-powered educational assistant for EduBridge AI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(learning.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "EduBridge AI",
        "version": "1.0.0",
        "llm_provider": settings.LLM_PROVIDER,
        "granite_configured": settings.granite_configured,
        "development_fallback": settings.ALLOW_DEVELOPMENT_FALLBACK,
    }
