"""EduBridge AI — RAG Orchestration Service"""
import json
from typing import List, Optional, Tuple
from loguru import logger
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import Document, ChatSession, ChatMessage
from app.schemas.schemas import SourceReference, ChatResponse
from app.services.embedding_service import embed_query
from app.services.vector_store import get_vector_store
from app.services.llm_provider import get_llm_provider
from app.services.prompts import (
    SYSTEM_PROMPTS,
    INSUFFICIENT_CONTEXT,
    DIFFICULTY_DESCRIPTIONS,
    LOCAL_EXAMPLE_ADDITION,
)

settings = get_settings()


def retrieve_context(
    question: str,
    document_id: Optional[int] = None,
    top_k: Optional[int] = None,
    score_threshold: Optional[float] = None,
) -> List[dict]:
    """
    Embed the query and retrieve relevant chunks from the vector store.
    """
    top_k = top_k or settings.RETRIEVAL_TOP_K
    threshold = score_threshold or settings.RETRIEVAL_SCORE_THRESHOLD

    query_embedding = embed_query(question)
    vector_store = get_vector_store()

    results = vector_store.search(
        query_embedding=query_embedding,
        top_k=top_k,
        document_id=document_id,
        score_threshold=threshold,
    )
    return results


def build_rag_answer(
    question: str,
    language: str,
    difficulty: str,
    document_id: Optional[int],
    db: Session,
    use_local_example: bool = False,
) -> Tuple[str, List[SourceReference], bool]:
    """
    Full RAG pipeline:
    1. Retrieve relevant chunks
    2. Build grounded prompt
    3. Generate answer via LLM
    4. Build source references
    Returns: (answer_text, sources, insufficient_context)
    """
    # 1. Retrieve
    chunks = retrieve_context(question, document_id=document_id)
    has_context = len(chunks) > 0

    # 2. Get document title for source references
    document_title = "Unknown Document"
    if document_id:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            document_title = doc.title

    # 3. Build sources
    sources: List[SourceReference] = [
        SourceReference(
            document_title=document_title,
            page_number=c.get("page_number"),
            excerpt=c["chunk_text"][:250] + ("..." if len(c["chunk_text"]) > 250 else ""),
            relevance_score=c["score"],
        )
        for c in chunks
    ]

    # 4. If no context, return language-appropriate fallback
    if not has_context:
        return INSUFFICIENT_CONTEXT[language], [], True

    # 5. Build context string (sanitise — treat as data, not instructions)
    context_parts = []
    for i, chunk in enumerate(chunks):
        page_info = f"[Page {chunk['page_number']}] " if chunk.get("page_number") else ""
        # Escape any potential prompt injection from document content
        safe_text = chunk["chunk_text"].replace("<|", "< |").replace("|>", "| >")
        context_parts.append(f"--- Excerpt {i+1} {page_info}---\n{safe_text}")
    context = "\n\n".join(context_parts)

    # 6. Get difficulty instruction
    difficulty_instruction = DIFFICULTY_DESCRIPTIONS.get(difficulty, {}).get(
        language, DIFFICULTY_DESCRIPTIONS["beginner"]["en"]
    )

    # 7. Build system prompt
    system_template = SYSTEM_PROMPTS[language]
    system_prompt = system_template.format(
        difficulty_instruction=difficulty_instruction,
        context=context,
    )

    # 8. Add local example instruction if requested
    if use_local_example:
        system_prompt += LOCAL_EXAMPLE_ADDITION[language]

    # 9. Generate via LLM
    try:
        llm = get_llm_provider()
        logger.info(f"Generating with {llm.provider_name}, lang={language}, diff={difficulty}")
        answer = llm.generate(
            system_prompt=system_prompt,
            user_message=question,
            max_tokens=1200,
            temperature=0.7,
        )
    except RuntimeError as e:
        logger.error(f"LLM generation failed: {e}")
        raise

    return answer, sources, False


def process_chat_request(
    question: str,
    language: str,
    difficulty: str,
    document_id: Optional[int],
    session_id: Optional[int],
    user_id: int,
    db: Session,
    use_local_example: bool = False,
) -> ChatResponse:
    """
    Full chat request handler:
    - Get or create session
    - Generate RAG answer
    - Save messages
    - Return structured response
    """
    # Get or create session
    if session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        ).first()
        if not session:
            session_id = None  # Will create new

    if not session_id:
        session = ChatSession(
            user_id=user_id,
            document_id=document_id,
            language=language,
            title=question[:80],
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=question,
        language=language,
    )
    db.add(user_msg)
    db.commit()

    # Generate answer
    try:
        answer, sources, insufficient = build_rag_answer(
            question=question,
            language=language,
            difficulty=difficulty,
            document_id=document_id,
            db=db,
            use_local_example=use_local_example,
        )
    except RuntimeError as e:
        # Save error message
        error_msg = f"Error generating response: {str(e)}"
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=error_msg,
            language=language,
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)
        return ChatResponse(
            session_id=session.id,
            message_id=assistant_msg.id,
            answer=error_msg,
            language=language,
            sources=[],
            insufficient_context=True,
        )

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=answer,
        language=language,
        sources=json.dumps([s.model_dump() for s in sources]),
        difficulty=difficulty,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    # Update session
    session.updated_at = session.updated_at  # trigger onupdate
    db.commit()

    return ChatResponse(
        session_id=session.id,
        message_id=assistant_msg.id,
        answer=answer,
        language=language,
        sources=sources,
        insufficient_context=insufficient,
    )
