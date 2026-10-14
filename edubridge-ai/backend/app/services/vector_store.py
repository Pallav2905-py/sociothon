"""EduBridge AI — FAISS Vector Store"""
import os
import json
import pickle
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np
from loguru import logger
from app.core.config import get_settings

settings = get_settings()

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.error("faiss-cpu not installed. Vector store unavailable.")


class FAISSVectorStore:
    """
    FAISS-based vector store with per-document metadata.
    Supports add, search, delete-by-document, and persistence.
    """

    def __init__(self, store_path: Optional[str] = None):
        self.store_path = Path(store_path or settings.VECTOR_STORE_PATH)
        self.store_path.mkdir(parents=True, exist_ok=True)
        self.index_path = self.store_path / "faiss.index"
        self.meta_path = self.store_path / "metadata.pkl"

        self.index = None
        self.metadata: List[Dict] = []  # parallel to FAISS vectors
        self._load_or_init()

    def _load_or_init(self):
        """Load existing index or create new one."""
        if self.index_path.exists() and self.meta_path.exists():
            try:
                self.index = faiss.read_index(str(self.index_path))
                with open(self.meta_path, "rb") as f:
                    self.metadata = pickle.load(f)
                logger.info(
                    f"Loaded FAISS index with {self.index.ntotal} vectors"
                )
            except Exception as e:
                logger.warning(f"Failed to load existing index: {e}. Creating new.")
                self._init_index(384)  # default MiniLM dim
        else:
            self._init_index(384)

    def _init_index(self, dim: int):
        """Initialise a flat L2 index."""
        if not FAISS_AVAILABLE:
            raise RuntimeError("FAISS not available")
        self.index = faiss.IndexFlatIP(dim)  # Inner Product for cosine (normalised vecs)
        self.metadata = []
        logger.info(f"Initialised new FAISS index (dim={dim})")

    def _ensure_dim(self, dim: int):
        """Reinitialise if dimension changed."""
        if self.index is None or (self.index.ntotal == 0 and self.index.d != dim):
            self._init_index(dim)

    def add_chunks(self, document_id: int, chunks: List[Dict], embeddings: np.ndarray):
        """
        Add embeddings for a document's chunks.
        chunks: list of {chunk_index, page_number, chunk_text, ...}
        embeddings: shape (n, dim)
        """
        if not FAISS_AVAILABLE:
            raise RuntimeError("FAISS not available")

        if len(chunks) == 0:
            return

        dim = embeddings.shape[1]
        self._ensure_dim(dim)

        # Add to FAISS
        embeddings = embeddings.astype(np.float32)
        self.index.add(embeddings)

        # Store metadata
        for i, chunk in enumerate(chunks):
            self.metadata.append({
                "document_id": document_id,
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk.get("page_number"),
                "chunk_text": chunk["chunk_text"],
            })

        self._save()
        logger.info(f"Added {len(chunks)} chunks for doc {document_id}")

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        document_id: Optional[int] = None,
        score_threshold: float = 0.0,
    ) -> List[Dict]:
        """
        Search for top_k similar chunks.
        If document_id provided, filter to that document.
        Returns list of {chunk_text, page_number, document_id, score}
        """
        if not FAISS_AVAILABLE or self.index is None:
            return []
        if self.index.ntotal == 0:
            return []

        query_embedding = query_embedding.astype(np.float32).reshape(1, -1)

        # Search more to allow filtering
        search_k = min(top_k * 10 if document_id else top_k, self.index.ntotal)
        scores, indices = self.index.search(query_embedding, search_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            meta = self.metadata[idx]
            if document_id and meta["document_id"] != document_id:
                continue
            if score < score_threshold:
                continue
            results.append({
                **meta,
                "score": float(score),
            })
            if len(results) >= top_k:
                break

        return results

    def delete_document(self, document_id: int):
        """
        Remove all vectors for a document.
        FAISS IndexFlatIP doesn't support in-place deletion,
        so we rebuild the index without the document's vectors.
        """
        if not FAISS_AVAILABLE or self.index is None:
            return

        remaining_meta = []
        remaining_indices = []

        for i, meta in enumerate(self.metadata):
            if meta["document_id"] != document_id:
                remaining_meta.append(meta)
                remaining_indices.append(i)

        if len(remaining_indices) == len(self.metadata):
            return  # Nothing to delete

        if not remaining_indices:
            self._init_index(self.index.d)
            self.metadata = []
        else:
            # Reconstruct vectors (only for IndexFlat which supports reconstruct)
            dim = self.index.d
            new_vectors = np.zeros((len(remaining_indices), dim), dtype=np.float32)
            for new_i, old_i in enumerate(remaining_indices):
                try:
                    new_vectors[new_i] = self.index.reconstruct(old_i)
                except Exception:
                    pass

            new_index = faiss.IndexFlatIP(dim)
            new_index.add(new_vectors)
            self.index = new_index
            self.metadata = remaining_meta

        self._save()
        logger.info(f"Deleted vectors for document {document_id}")

    def _save(self):
        """Persist index and metadata to disk."""
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "wb") as f:
            pickle.dump(self.metadata, f)

    @property
    def total_vectors(self) -> int:
        return self.index.ntotal if self.index else 0


# ─── Singleton ────────────────────────────────────────────────────────────────
_vector_store: Optional[FAISSVectorStore] = None


def get_vector_store() -> FAISSVectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = FAISSVectorStore()
    return _vector_store
