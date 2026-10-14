"""EduBridge AI — Documents API Routes"""
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import get_db
from app.models.models import Document, DocumentChunk, User
from app.schemas.schemas import DocumentOut, DocumentPreview
from app.api.deps import get_current_user, require_teacher
from app.services.document_processor import extract_text_from_pdf, get_page_texts
from app.services.chunking import chunk_page_texts
from app.services.embedding_service import embed_texts
from app.services.vector_store import get_vector_store

settings = get_settings()
router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_TYPES = {"application/pdf", "application/x-pdf"}
ALLOWED_EXTENSIONS = {".pdf"}


def _process_document_background(document_id: int, file_path: str, db_session):
    """
    Background task: extract text → chunk → embed → index.
    """
    from app.database.session import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        doc.processing_status = "processing"
        db.commit()

        # 1. Extract text
        full_text, page_count, is_scanned = extract_text_from_pdf(file_path)

        if is_scanned:
            doc.processing_status = "scanned_pdf"
            doc.processing_error = (
                "This PDF appears to be scanned (image-based). "
                "OCR is not currently implemented. "
                "Please upload a text-based PDF."
            )
            doc.page_count = page_count
            db.commit()
            return

        doc.page_count = page_count
        doc.extracted_text_preview = full_text[:500] if full_text else ""

        # 2. Chunk
        page_texts = get_page_texts(file_path)
        chunks = chunk_page_texts(page_texts)

        if not chunks:
            doc.processing_status = "failed"
            doc.processing_error = "No text could be extracted from the document"
            db.commit()
            return

        # 3. Save chunks to DB
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
        for chunk in chunks:
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=chunk["chunk_index"],
                page_number=chunk.get("page_number"),
                chunk_text=chunk["chunk_text"],
                char_start=chunk.get("char_start"),
                char_end=chunk.get("char_end"),
                token_count=chunk.get("token_count"),
            )
            db.add(db_chunk)
        db.commit()

        # 4. Embed
        texts = [c["chunk_text"] for c in chunks]
        embeddings = embed_texts(texts)

        # 5. Index in FAISS
        vector_store = get_vector_store()
        vector_store.delete_document(document_id)  # Clean old vectors
        vector_store.add_chunks(document_id, chunks, embeddings)

        doc.processing_status = "completed"
        db.commit()

    except Exception as e:
        import traceback
        error_msg = f"Processing failed: {str(e)}"
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.processing_status = "failed"
            doc.processing_error = error_msg
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=255),
    subject: Optional[str] = Form(None),
    chapter: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF files are allowed. Got: {ext}",
        )

    # Validate MIME type
    content_type = file.content_type or ""
    if content_type and content_type not in ALLOWED_TYPES:
        # Some clients send application/octet-stream for PDFs, allow it
        if content_type != "application/octet-stream":
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {content_type}",
            )

    # Read and check size
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_MB}MB",
        )

    # Save file securely
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / safe_filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    doc = Document(
        title=title,
        subject=subject,
        chapter=chapter,
        description=description,
        file_path=str(file_path),
        original_filename=file.filename,
        file_size=len(content),
        processing_status="pending",
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process in background
    background_tasks.add_task(
        _process_document_background, doc.id, str(file_path), None
    )

    return doc


@router.get("", response_model=List[DocumentOut])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "teacher":
        docs = db.query(Document).filter(
            Document.uploaded_by == current_user.id
        ).order_by(Document.created_at.desc()).all()
    else:
        docs = db.query(Document).filter(
            Document.processing_status == "completed"
        ).order_by(Document.created_at.desc()).all()
    return docs


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.uploaded_by == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from vector store
    try:
        vector_store = get_vector_store()
        vector_store.delete_document(doc_id)
    except Exception:
        pass

    # Delete file
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass

    db.delete(doc)
    db.commit()


@router.get("/{doc_id}/preview", response_model=DocumentPreview)
def preview_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunk_count = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == doc_id
    ).count()

    return DocumentPreview(
        id=doc.id,
        title=doc.title,
        extracted_text_preview=doc.extracted_text_preview,
        page_count=doc.page_count,
        chunk_count=chunk_count,
    )


@router.post("/{doc_id}/reprocess", response_model=DocumentOut)
async def reprocess_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.uploaded_by == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=400, detail="File not found on server")

    doc.processing_status = "pending"
    doc.processing_error = None
    db.commit()

    background_tasks.add_task(
        _process_document_background, doc.id, doc.file_path, None
    )
    return doc
