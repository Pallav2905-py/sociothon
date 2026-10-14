"""EduBridge AI — Pydantic Schemas"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
import re


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="student")
    preferred_language: str = Field(default="en")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ("student", "teacher"):
            raise ValueError("role must be 'student' or 'teacher'")
        return v

    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v):
        if v not in ("en", "hi", "mr"):
            raise ValueError("language must be 'en', 'hi', or 'mr'")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    preferred_language: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Documents ────────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subject: Optional[str] = None
    chapter: Optional[str] = None
    description: Optional[str] = None


class DocumentOut(BaseModel):
    id: int
    title: str
    subject: Optional[str]
    chapter: Optional[str]
    description: Optional[str]
    original_filename: Optional[str]
    file_size: Optional[int]
    page_count: int
    processing_status: str
    processing_error: Optional[str]
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentPreview(BaseModel):
    id: int
    title: str
    extracted_text_preview: Optional[str]
    page_count: int
    chunk_count: int


# ─── Chat ─────────────────────────────────────────────────────────────────────

class SourceReference(BaseModel):
    document_title: str
    page_number: Optional[int]
    excerpt: str
    relevance_score: float


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    language: str = Field(default="en")
    difficulty: str = Field(default="beginner")
    document_id: Optional[int] = None
    session_id: Optional[int] = None
    use_local_example: bool = False

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        if v not in ("en", "hi", "mr"):
            raise ValueError("language must be 'en', 'hi', or 'mr'")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        if v not in ("beginner", "intermediate", "advanced"):
            raise ValueError("difficulty must be 'beginner', 'intermediate', or 'advanced'")
        return v


class ChatResponse(BaseModel):
    session_id: int
    message_id: int
    answer: str
    language: str
    sources: List[SourceReference]
    insufficient_context: bool = False
    suggested_followup: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    language: Optional[str]
    sources: Optional[List[SourceReference]]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: int
    document_id: Optional[int]
    title: Optional[str]
    language: str
    created_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True


# ─── Summary ──────────────────────────────────────────────────────────────────

class SummaryRequest(BaseModel):
    document_id: int
    language: str = "en"
    summary_type: str = "short"  # short | detailed | key_points

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        if v not in ("en", "hi", "mr"):
            raise ValueError("language must be 'en', 'hi', or 'mr'")
        return v

    @field_validator("summary_type")
    @classmethod
    def validate_type(cls, v):
        if v not in ("short", "detailed", "key_points"):
            raise ValueError("summary_type must be 'short', 'detailed', or 'key_points'")
        return v


class SummaryResponse(BaseModel):
    document_id: int
    document_title: str
    summary: str
    language: str
    summary_type: str
    sources: List[SourceReference]


# ─── Quiz ─────────────────────────────────────────────────────────────────────

class QuizQuestion(BaseModel):
    question_number: int
    question: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_answer: int  # 0-indexed
    explanation: str
    source_reference: Optional[SourceReference] = None


class QuizGenerateRequest(BaseModel):
    document_id: int
    language: str = "en"
    difficulty: str = "medium"
    num_questions: int = Field(default=5, ge=5, le=15)
    question_type: str = "mcq"

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        if v not in ("en", "hi", "mr"):
            raise ValueError("language must be 'en', 'hi', or 'mr'")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        if v not in ("easy", "medium", "hard"):
            raise ValueError("difficulty must be 'easy', 'medium', or 'hard'")
        return v


class QuizOut(BaseModel):
    quiz_id: int
    document_id: int
    document_title: str
    language: str
    difficulty: str
    questions: List[QuizQuestion]
    created_at: datetime


class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[int]  # 0-indexed selected option for each question


class QuizResult(BaseModel):
    attempt_id: int
    quiz_id: int
    score: float
    total_questions: int
    correct_count: int
    percentage: float
    questions: List[QuizQuestion]
    user_answers: List[int]
    completed_at: datetime


# ─── Learning Progress ────────────────────────────────────────────────────────

class LearningProgress(BaseModel):
    user_id: int
    total_sessions: int
    total_questions_asked: int
    quizzes_completed: int
    average_quiz_score: float
    recent_documents: List[DocumentOut]
    recent_activity: List[dict]
