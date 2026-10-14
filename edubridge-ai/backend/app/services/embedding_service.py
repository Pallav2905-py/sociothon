"""EduBridge AI — Embedding Service (multilingual sentence-transformers)"""
import numpy as np
from typing import List
from functools import lru_cache
from loguru import logger
from app.core.config import get_settings

settings = get_settings()

_model = None


def get_embedding_model():
    """Load model lazily (singleton)."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise RuntimeError(f"Embedding model unavailable: {e}")
    return _model


def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Embed a list of texts.
    Returns numpy array of shape (n, embedding_dim).
    """
    if not texts:
        return np.array([])

    model = get_embedding_model()
    # Normalise embeddings for cosine similarity
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=32,
    )
    return embeddings


def embed_query(query: str) -> np.ndarray:
    """Embed a single query string."""
    return embed_texts([query])[0]


def get_embedding_dimension() -> int:
    """Get the dimension of embeddings from the current model."""
    model = get_embedding_model()
    return model.get_sentence_embedding_dimension()
