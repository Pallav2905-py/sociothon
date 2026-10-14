"""EduBridge AI — SQLAlchemy Database Models"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # student | teacher
    preferred_language = Column(String(10), default="en")  # en | hi | mr
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    documents = relationship("Document", back_populates="uploader")
    chat_sessions = relationship("ChatSession", back_populates="user")
    quizzes = relationship("Quiz", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(120))
    chapter = Column(String(120))
    description = Column(Text)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255))
    file_size = Column(Integer)
    page_count = Column(Integer, default=0)
    processing_status = Column(String(30), default="pending")
    # pending | processing | completed | failed | scanned_pdf
    processing_error = Column(Text)
    extracted_text_preview = Column(Text)  # first ~500 chars
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    uploader = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="document")
    quizzes = relationship("Quiz", back_populates="document")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer)
    chunk_text = Column(Text, nullable=False)
    char_start = Column(Integer)
    char_end = Column(Integer)
    token_count = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("ix_chunks_document_id", "document_id"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    title = Column(String(255))
    language = Column(String(10), default="en")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="chat_sessions")
    document = relationship("Document", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    language = Column(String(10))
    sources = Column(Text)  # JSON-encoded list of source references
    difficulty = Column(String(20))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("ix_messages_session_id", "session_id"),
    )


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    language = Column(String(10), default="en")
    difficulty = Column(String(20), default="medium")
    num_questions = Column(Integer, default=5)
    questions_json = Column(Text)  # JSON-encoded list of questions
    created_at = Column(DateTime(timezone=True), default=utcnow)

    document = relationship("Document", back_populates="quizzes")
    user = relationship("User", back_populates="quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float)
    total_questions = Column(Integer)
    answers_json = Column(Text)  # JSON-encoded student answers
    completed_at = Column(DateTime(timezone=True), default=utcnow)

    quiz = relationship("Quiz", back_populates="attempts")
