"""EduBridge AI — Quiz Generation Service"""
import json
import re
from typing import List, Optional
from loguru import logger
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import Document, Quiz, QuizAttempt
from app.schemas.schemas import QuizQuestion, QuizOut, QuizResult, SourceReference
from app.services.embedding_service import embed_query
from app.services.vector_store import get_vector_store
from app.services.llm_provider import get_llm_provider
from app.services.prompts import QUIZ_PROMPTS

settings = get_settings()


def _get_document_context(document_id: int, db: Session) -> tuple[str, str]:
    """Get document text chunks and title for quiz generation."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    vector_store = get_vector_store()
    # Use generic educational query to get broad coverage
    query_embedding = embed_query("main concepts topics important information")
    chunks = vector_store.search(
        query_embedding=query_embedding,
        top_k=15,
        document_id=document_id,
        score_threshold=0.0,  # Get all chunks for quiz generation
    )

    context = "\n\n".join(
        f"[Page {c['page_number']}] {c['chunk_text']}"
        for c in chunks
    )
    return context, doc.title


def generate_quiz(
    document_id: int,
    language: str,
    difficulty: str,
    num_questions: int,
    user_id: int,
    db: Session,
) -> QuizOut:
    """Generate a quiz from document content using the LLM."""
    context, doc_title = _get_document_context(document_id, db)

    if not context.strip():
        raise ValueError("No content available for quiz generation. Process the document first.")

    # Build prompt
    prompt_template = QUIZ_PROMPTS[language]
    system_prompt = f"""You are an educational quiz generator for EduBridge AI.
Generate quiz questions ONLY from the provided content. 
Return ONLY valid JSON. Do not add any text before or after the JSON."""

    user_message = prompt_template.format(
        num_questions=num_questions,
        difficulty=difficulty,
        context=context[:4000],  # Limit context size
    )

    # Generate
    llm = get_llm_provider()
    raw_response = llm.generate(
        system_prompt=system_prompt,
        user_message=user_message,
        max_tokens=2000,
        temperature=0.5,
    )

    # Parse JSON response
    questions = _parse_quiz_response(raw_response, num_questions)

    if not questions:
        raise ValueError("Failed to generate valid quiz questions")

    # Save to database
    from datetime import datetime, timezone
    quiz = Quiz(
        document_id=document_id,
        user_id=user_id,
        language=language,
        difficulty=difficulty,
        num_questions=len(questions),
        questions_json=json.dumps([q.model_dump() for q in questions]),
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    return QuizOut(
        quiz_id=quiz.id,
        document_id=document_id,
        document_title=doc_title,
        language=language,
        difficulty=difficulty,
        questions=questions,
        created_at=quiz.created_at,
    )


def _parse_quiz_response(raw: str, expected_count: int) -> List[QuizQuestion]:
    """Parse LLM response and extract valid quiz questions."""
    # Extract JSON from response
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        logger.error(f"No JSON found in quiz response: {raw[:200]}")
        return []

    try:
        data = json.loads(json_match.group())
        raw_questions = data.get("questions", [])
    except json.JSONDecodeError as e:
        logger.error(f"Quiz JSON parse error: {e}\nRaw: {raw[:500]}")
        return []

    questions = []
    for i, q in enumerate(raw_questions):
        try:
            # Validate structure
            if not all(k in q for k in ["question", "options", "correct_answer", "explanation"]):
                continue
            if len(q["options"]) != 4:
                continue
            correct = int(q["correct_answer"])
            if not 0 <= correct <= 3:
                continue

            questions.append(QuizQuestion(
                question_number=i + 1,
                question=q["question"],
                options=q["options"],
                correct_answer=correct,
                explanation=q["explanation"],
            ))
        except (KeyError, ValueError, TypeError) as e:
            logger.warning(f"Skipping invalid question {i}: {e}")

    return questions[:expected_count]


def submit_quiz(
    quiz_id: int,
    answers: List[int],
    user_id: int,
    db: Session,
) -> QuizResult:
    """Score a quiz attempt and return results."""
    quiz = db.query(Quiz).filter(
        Quiz.id == quiz_id,
        Quiz.user_id == user_id,
    ).first()
    if not quiz:
        raise ValueError(f"Quiz {quiz_id} not found")

    questions_data = json.loads(quiz.questions_json)
    questions = [QuizQuestion(**q) for q in questions_data]

    if len(answers) != len(questions):
        raise ValueError(f"Expected {len(questions)} answers, got {len(answers)}")

    # Score
    correct_count = sum(
        1 for q, a in zip(questions, answers)
        if a == q.correct_answer
    )
    total = len(questions)
    score = float(correct_count)
    percentage = (correct_count / total) * 100 if total > 0 else 0.0

    # Save attempt
    from datetime import datetime, timezone
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        score=score,
        total_questions=total,
        answers_json=json.dumps(answers),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return QuizResult(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        score=score,
        total_questions=total,
        correct_count=correct_count,
        percentage=percentage,
        questions=questions,
        user_answers=answers,
        completed_at=attempt.completed_at,
    )
