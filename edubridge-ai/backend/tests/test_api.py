"""EduBridge AI — Backend Tests (Fixed)"""
import pytest
import json
import os
from unittest.mock import patch, MagicMock
import numpy as np

# ── MUST set env vars BEFORE any app imports ──────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///./test_edubridge.db"
os.environ["ALLOW_DEVELOPMENT_FALLBACK"] = "true"
os.environ["LLM_PROVIDER"] = "development"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-12345"
os.environ["EMBEDDING_MODEL"] = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
os.environ["UPLOAD_DIR"] = "./storage/test_uploads"
os.environ["VECTOR_STORE_PATH"] = "./storage/test_vector"

# ── Mock embedding model to prevent OOM ───────────────────────────────────────
MOCK_DIM = 384
_mock_embeddings = np.random.rand(1, MOCK_DIM).astype(np.float32)

mock_model = MagicMock()
mock_model.encode.return_value = np.random.rand(10, MOCK_DIM).astype(np.float32)
mock_model.get_sentence_embedding_dimension.return_value = MOCK_DIM

# Patch before importing app modules
with patch("sentence_transformers.SentenceTransformer", return_value=mock_model):
    # Clear lru_cache so env vars take effect
    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.main import app
    from app.database.session import get_db
    from app.models.models import Base
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from fastapi.testclient import TestClient

# ── Test DB (file-based for persistence across test module) ───────────────────
TEST_DB_URL = "sqlite:///./test_edubridge.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create all tables in the test DB
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# ── Mock embedding service globally ───────────────────────────────────────────
import app.services.embedding_service as emb_svc
emb_svc._model = mock_model

client = TestClient(app, raise_server_exceptions=False)

# ── Helpers ───────────────────────────────────────────────────────────────────
_counter = [0]

def unique_email(role="student"):
    _counter[0] += 1
    return f"{role}_{_counter[0]}@test.edubridge.ai"


def register_and_get_token(role="student"):
    email = unique_email(role)
    r = client.post("/api/auth/register", json={
        "name": f"Test {role.title()}",
        "email": email,
        "password": "password123",
        "role": role,
        "preferred_language": "en",
    })
    assert r.status_code == 201, f"Register failed: {r.text}"
    return r.json()["access_token"], email


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════════════════════

def test_health():
    """GET /api/health returns 200."""
    r = client.get("/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "healthy"
    assert "llm_provider" in d


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

def test_register_student():
    """Student registration returns token + correct role."""
    token, email = register_and_get_token("student")
    assert token

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "student"


def test_register_teacher():
    """Teacher registration returns token + correct role."""
    token, _ = register_and_get_token("teacher")
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "teacher"


def test_preferred_language_marathi():
    """Registration preserves Marathi language preference."""
    email = unique_email()
    r = client.post("/api/auth/register", json={
        "name": "Marathi Student",
        "email": email,
        "password": "password123",
        "role": "student",
        "preferred_language": "mr",
    })
    assert r.status_code == 201
    assert r.json()["user"]["preferred_language"] == "mr"


def test_preferred_language_hindi():
    """Registration preserves Hindi language preference."""
    email = unique_email()
    r = client.post("/api/auth/register", json={
        "name": "Hindi Student",
        "email": email,
        "password": "password123",
        "role": "student",
        "preferred_language": "hi",
    })
    assert r.status_code == 201
    assert r.json()["user"]["preferred_language"] == "hi"


def test_duplicate_email():
    """Duplicate email returns 409."""
    email = unique_email()
    payload = {"name": "Dup", "email": email, "password": "pass123", "role": "student", "preferred_language": "en"}
    client.post("/api/auth/register", json=payload)
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 409


def test_login_success():
    """Login with correct credentials returns token."""
    email = unique_email()
    client.post("/api/auth/register", json={
        "name": "Login User", "email": email, "password": "correctpass",
        "role": "student", "preferred_language": "en"
    })
    r = client.post("/api/auth/login", json={"email": email, "password": "correctpass"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password():
    """Wrong password returns 401."""
    email = unique_email()
    client.post("/api/auth/register", json={
        "name": "Wrong Pass", "email": email, "password": "rightpass",
        "role": "student", "preferred_language": "en"
    })
    r = client.post("/api/auth/login", json={"email": email, "password": "wrongpass"})
    assert r.status_code == 401


def test_unauthenticated_returns_403():
    """No token → 403 from HTTPBearer."""
    r = client.get("/api/documents")
    assert r.status_code == 403


def test_invalid_token_returns_401():
    """Bad token → 401."""
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert r.status_code == 401


def test_role_invalid():
    """Invalid role rejected at registration (422)."""
    r = client.post("/api/auth/register", json={
        "name": "Admin", "email": "admin@test.ai", "password": "pass123",
        "role": "admin", "preferred_language": "en"
    })
    assert r.status_code == 422


def test_language_invalid():
    """Unsupported language code rejected (422)."""
    r = client.post("/api/auth/register", json={
        "name": "French", "email": "fr@test.ai", "password": "pass123",
        "role": "student", "preferred_language": "fr"
    })
    assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS
# ═══════════════════════════════════════════════════════════════════════════════

def test_list_documents_authenticated():
    """Authenticated student can list documents."""
    token, _ = register_and_get_token("student")
    r = client.get("/api/documents", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_upload_requires_teacher_role():
    """Student cannot upload — 403."""
    token, _ = register_and_get_token("student")
    r = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
        data={"title": "Test"},
    )
    assert r.status_code == 403


def test_upload_rejects_non_pdf():
    """Teacher upload with .txt extension → 400."""
    token, _ = register_and_get_token("teacher")
    r = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("notes.txt", b"hello world", "text/plain")},
        data={"title": "Notes"},
    )
    assert r.status_code == 400


def test_upload_rejects_empty_file():
    """Empty PDF → 400."""
    token, _ = register_and_get_token("teacher")
    r = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("empty.pdf", b"", "application/pdf")},
        data={"title": "Empty"},
    )
    assert r.status_code == 400


def test_delete_requires_teacher():
    """Student cannot delete document."""
    student_token, _ = register_and_get_token("student")
    r = client.delete(
        "/api/documents/999",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# CHAT
# ═══════════════════════════════════════════════════════════════════════════════

def test_chat_english():
    """English question returns 200 with answer."""
    token, _ = register_and_get_token("student")
    r = client.post("/api/chat", json={
        "question": "What is photosynthesis?",
        "language": "en",
        "difficulty": "beginner",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    d = r.json()
    assert "answer" in d
    assert "session_id" in d
    assert d["language"] == "en"


def test_chat_hindi():
    """Hindi question accepted and returns language=hi."""
    token, _ = register_and_get_token("student")
    r = client.post("/api/chat", json={
        "question": "प्रकाशसंश्लेषण क्या है?",
        "language": "hi",
        "difficulty": "beginner",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["language"] == "hi"


def test_chat_marathi():
    """Marathi question accepted and returns language=mr."""
    token, _ = register_and_get_token("student")
    r = client.post("/api/chat", json={
        "question": "प्रकाशसंश्लेषण म्हणजे काय?",
        "language": "mr",
        "difficulty": "beginner",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["language"] == "mr"


def test_chat_invalid_language():
    """Unsupported language code rejected (422)."""
    token, _ = register_and_get_token("student")
    r = client.post("/api/chat", json={
        "question": "Bonjour",
        "language": "fr",
        "difficulty": "beginner",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 422


def test_chat_session_persists():
    """Second message continues same session when session_id passed."""
    token, _ = register_and_get_token("student")
    r1 = client.post("/api/chat", json={
        "question": "What is osmosis?",
        "language": "en",
        "difficulty": "beginner",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 200
    session_id = r1.json()["session_id"]

    r2 = client.post("/api/chat", json={
        "question": "Give me an example.",
        "language": "en",
        "difficulty": "beginner",
        "session_id": session_id,
    }, headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert r2.json()["session_id"] == session_id


def test_chat_history():
    """After asking, history returns at least one session."""
    token, _ = register_and_get_token("student")
    client.post("/api/chat", json={
        "question": "Explain respiration",
        "language": "en",
        "difficulty": "beginner",
    }, headers={"Authorization": f"Bearer {token}"})
    r = client.get("/api/chat/history", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ═══════════════════════════════════════════════════════════════════════════════
# LEARNING PROGRESS
# ═══════════════════════════════════════════════════════════════════════════════

def test_learning_progress_structure():
    """Progress endpoint returns expected fields."""
    token, _ = register_and_get_token("student")
    r = client.get("/api/learning/progress", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    d = r.json()
    for field in ["total_sessions", "total_questions_asked", "quizzes_completed", "average_quiz_score"]:
        assert field in d, f"Missing field: {field}"


def test_progress_counts_questions():
    """Asking questions increments total_questions_asked."""
    token, _ = register_and_get_token("student")
    for _ in range(2):
        client.post("/api/chat", json={
            "question": "What is chlorophyll?",
            "language": "en",
            "difficulty": "beginner",
        }, headers={"Authorization": f"Bearer {token}"})

    r = client.get("/api/learning/progress", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["total_questions_asked"] >= 2


# ═══════════════════════════════════════════════════════════════════════════════
# CHUNKING (Unit tests — no network)
# ═══════════════════════════════════════════════════════════════════════════════

def test_chunking_basic():
    """Text chunking produces multiple chunks for long text."""
    from app.services.chunking import chunk_page_texts
    pages = [{"page_number": 1, "text": "Sentence number one. " * 100}]
    chunks = chunk_page_texts(pages, chunk_size=300, chunk_overlap=50)
    assert len(chunks) > 1
    for c in chunks:
        assert c["chunk_text"].strip()
        assert c["page_number"] == 1


def test_chunking_empty_text():
    """Empty text produces zero chunks."""
    from app.services.chunking import chunk_page_texts
    chunks = chunk_page_texts([{"page_number": 1, "text": ""}])
    assert len(chunks) == 0


def test_chunking_devanagari():
    """Devanagari text (Marathi) is chunked correctly."""
    from app.services.chunking import chunk_page_texts
    text = "प्रकाशसंश्लेषण म्हणजे वनस्पतींनी सूर्यप्रकाश वापरून अन्न तयार करण्याची प्रक्रिया आहे। " * 30
    chunks = chunk_page_texts([{"page_number": 1, "text": text}])
    assert len(chunks) >= 1
    assert any("प्रकाश" in c["chunk_text"] for c in chunks)


def test_chunking_metadata():
    """Each chunk contains required metadata fields."""
    from app.services.chunking import chunk_page_texts
    pages = [{"page_number": 3, "text": "Word " * 200}]
    chunks = chunk_page_texts(pages)
    for c in chunks:
        assert "chunk_index" in c
        assert "page_number" in c
        assert "chunk_text" in c


# ── Cleanup ───────────────────────────────────────────────────────────────────
import atexit

def cleanup():
    """Remove test DB file after tests."""
    import os
    for f in ["./test_edubridge.db"]:
        try:
            os.remove(f)
        except FileNotFoundError:
            pass

atexit.register(cleanup)
