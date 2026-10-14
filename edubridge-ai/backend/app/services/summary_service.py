"""EduBridge AI — Summary Generation Service"""
from typing import List
from loguru import logger
from sqlalchemy.orm import Session

from app.models.models import Document
from app.schemas.schemas import SummaryResponse, SourceReference
from app.services.embedding_service import embed_query
from app.services.vector_store import get_vector_store
from app.services.llm_provider import get_llm_provider
from app.services.prompts import SUMMARY_PROMPTS, DIFFICULTY_DESCRIPTIONS


def generate_summary(
    document_id: int,
    language: str,
    summary_type: str,
    db: Session,
) -> SummaryResponse:
    """Generate a chapter summary from document content."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    if doc.processing_status != "completed":
        raise ValueError(
            f"Document not ready for summarisation (status: {doc.processing_status})"
        )

    # Get broad chunk coverage for summary
    vector_store = get_vector_store()
    query_embedding = embed_query("main concepts overview summary introduction conclusion")
    chunks = vector_store.search(
        query_embedding=query_embedding,
        top_k=20,
        document_id=document_id,
        score_threshold=0.0,
    )

    if not chunks:
        raise ValueError("No content found for this document. Please reprocess it.")

    # Build context
    context = "\n\n".join(
        f"[Page {c['page_number']}] {c['chunk_text']}"
        for c in chunks
    )[:5000]  # Limit tokens

    # Get prompt
    summary_instruction = SUMMARY_PROMPTS[language][summary_type]

    system_prompt = f"""You are EduBridge AI, a multilingual educational assistant.
Your task is to summarise educational content for students.
Language: Respond in {'Marathi' if language == 'mr' else 'Hindi' if language == 'hi' else 'English'}.
Use clear, student-friendly language. Preserve important technical terms.
Do not invent content that is not in the provided excerpts."""

    user_message = f"""{summary_instruction}

Document: {doc.title}

Content:
{context}"""

    llm = get_llm_provider()
    logger.info(f"Generating {summary_type} summary in {language} for doc {document_id}")
    summary_text = llm.generate(
        system_prompt=system_prompt,
        user_message=user_message,
        max_tokens=1500,
        temperature=0.5,
    )

    # Build source references from top chunks
    sources = [
        SourceReference(
            document_title=doc.title,
            page_number=c.get("page_number"),
            excerpt=c["chunk_text"][:200] + "...",
            relevance_score=c["score"],
        )
        for c in chunks[:3]
    ]

    return SummaryResponse(
        document_id=document_id,
        document_title=doc.title,
        summary=summary_text,
        language=language,
        summary_type=summary_type,
        sources=sources,
    )
