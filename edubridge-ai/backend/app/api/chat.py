"""EduBridge AI — Chat API Routes"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import User, ChatSession, ChatMessage
from app.schemas.schemas import (
    ChatRequest, ChatResponse, ChatSessionOut, ChatMessageOut, SourceReference
)
from app.api.deps import get_current_user
from app.services.rag_service import process_chat_request

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def ask_question(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return process_chat_request(
            question=request.question,
            language=request.language,
            difficulty=request.difficulty,
            document_id=request.document_id,
            session_id=request.session_id,
            user_id=current_user.id,
            db=db,
            use_local_example=request.use_local_example,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history", response_model=List[ChatSessionOut])
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).limit(20).all()

    result = []
    for session in sessions:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.id
        ).order_by(ChatMessage.created_at.asc()).all()

        msgs = []
        for msg in messages:
            sources = []
            if msg.sources:
                try:
                    sources_data = json.loads(msg.sources)
                    sources = [SourceReference(**s) for s in sources_data]
                except Exception:
                    pass
            msgs.append(ChatMessageOut(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                language=msg.language,
                sources=sources if sources else None,
                created_at=msg.created_at,
            ))

        result.append(ChatSessionOut(
            id=session.id,
            document_id=session.document_id,
            title=session.title,
            language=session.language,
            created_at=session.created_at,
            messages=msgs,
        ))
    return result


@router.get("/{session_id}", response_model=ChatSessionOut)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.asc()).all()

    msgs = []
    for msg in messages:
        sources = []
        if msg.sources:
            try:
                sources_data = json.loads(msg.sources)
                sources = [SourceReference(**s) for s in sources_data]
            except Exception:
                pass
        msgs.append(ChatMessageOut(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            language=msg.language,
            sources=sources if sources else None,
            created_at=msg.created_at,
        ))

    return ChatSessionOut(
        id=session.id,
        document_id=session.document_id,
        title=session.title,
        language=session.language,
        created_at=session.created_at,
        messages=msgs,
    )


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
