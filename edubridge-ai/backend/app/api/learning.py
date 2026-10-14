"""EduBridge AI — Learning (Summary, Quiz, Progress) API Routes"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import User, Document, ChatSession, ChatMessage, Quiz, QuizAttempt
from app.schemas.schemas import (
    SummaryRequest, SummaryResponse,
    QuizGenerateRequest, QuizOut,
    QuizSubmitRequest, QuizResult,
    LearningProgress, DocumentOut,
)
from app.api.deps import get_current_user
from app.services.summary_service import generate_summary
from app.services.quiz_service import generate_quiz, submit_quiz

router = APIRouter(prefix="/api", tags=["learning"])


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.post("/summary/generate", response_model=SummaryResponse)
def create_summary(
    request: SummaryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return generate_summary(
            document_id=request.document_id,
            language=request.language,
            summary_type=request.summary_type,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── Quiz ─────────────────────────────────────────────────────────────────────

@router.post("/quiz/generate", response_model=QuizOut)
def create_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return generate_quiz(
            document_id=request.document_id,
            language=request.language,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/quiz/submit", response_model=QuizResult)
def submit_quiz_route(
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return submit_quiz(
            quiz_id=request.quiz_id,
            answers=request.answers,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Progress ─────────────────────────────────────────────────────────────────

@router.get("/learning/progress", response_model=LearningProgress)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Total sessions
    total_sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).count()

    # Total questions asked
    total_questions = db.query(ChatMessage).join(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatMessage.role == "user",
    ).count()

    # Quiz stats
    quizzes_completed = db.query(QuizAttempt).join(Quiz).filter(
        Quiz.user_id == current_user.id
    ).count()

    avg_score_result = db.query(func.avg(QuizAttempt.score)).join(Quiz).filter(
        Quiz.user_id == current_user.id
    ).scalar()
    avg_score = float(avg_score_result) if avg_score_result else 0.0

    # Recent documents (from sessions)
    recent_doc_ids = db.query(ChatSession.document_id).filter(
        ChatSession.user_id == current_user.id,
        ChatSession.document_id.isnot(None),
    ).order_by(ChatSession.updated_at.desc()).limit(5).all()

    recent_docs = []
    seen_ids = set()
    for (doc_id,) in recent_doc_ids:
        if doc_id and doc_id not in seen_ids:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                recent_docs.append(DocumentOut.model_validate(doc))
                seen_ids.add(doc_id)

    # Recent activity
    recent_msgs = db.query(ChatMessage).join(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatMessage.role == "user",
    ).order_by(ChatMessage.created_at.desc()).limit(5).all()

    recent_activity = [
        {
            "type": "question",
            "content": msg.content[:80],
            "language": msg.language,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in recent_msgs
    ]

    return LearningProgress(
        user_id=current_user.id,
        total_sessions=total_sessions,
        total_questions_asked=total_questions,
        quizzes_completed=quizzes_completed,
        average_quiz_score=avg_score,
        recent_documents=recent_docs,
        recent_activity=recent_activity,
    )
