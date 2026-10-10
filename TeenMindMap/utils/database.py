"""
Database utility functions for the ZenGen application.
"""

import os
import json
import time
import logging
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a database engine with connection pooling
DATABASE_URL = os.environ.get("DATABASE_URL")

# Configure the engine with appropriate pool settings
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections after 30 minutes
    pool_pre_ping=True,  # Enable connection health checks
)

# Create a base class for declarative models
Base = declarative_base()

# Define database models
class User(Base):
    """User model for authentication and profile information."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    assessments = relationship("Assessment", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert user object to dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "password_hash": self.password_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Assessment(Base):
    """Model for storing mental health assessment results."""
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    responses = Column(Text, nullable=False)  # JSON string of question/answer pairs
    scores = Column(Text, nullable=False)  # JSON string of category scores
    analysis = Column(Text)  # JSON string of AI analysis results
    completed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="assessments")
    
    def set_responses(self, responses_dict):
        """Set responses as JSON string."""
        self.responses = json.dumps(responses_dict)
    
    def get_responses(self):
        """Get responses as dictionary."""
        return json.loads(self.responses) if self.responses else {}
    
    def set_scores(self, scores_dict):
        """Set scores as JSON string."""
        self.scores = json.dumps(scores_dict)
    
    def get_scores(self):
        """Get scores as dictionary."""
        return json.loads(self.scores) if self.scores else {}
    
    def set_analysis(self, analysis_dict):
        """Set analysis as JSON string."""
        self.analysis = json.dumps(analysis_dict) if analysis_dict else None
    
    def get_analysis(self):
        """Get analysis as dictionary."""
        return json.loads(self.analysis) if self.analysis else {}
    
    def to_dict(self):
        """Convert assessment object to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "responses": self.get_responses(),
            "scores": self.get_scores(),
            "analysis": self.get_analysis(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }


class ChatSession(Base):
    """Model for storing chat sessions."""
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert chat session object to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "messages": [msg.to_dict() for msg in self.messages]
        }


class ChatMessage(Base):
    """Model for storing individual chat messages."""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(50), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
    def to_dict(self):
        """Convert chat message object to dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# Create the tables in the database
Base.metadata.create_all(engine)

# Create a session factory
SessionFactory = sessionmaker(bind=engine)


# Database management functions
def get_db_session():
    """Get a new database session with retry logic for connection issues."""
    max_retries = 3
    retry_delay = 1  # Start with 1 second delay
    
    for attempt in range(max_retries):
        try:
            return SessionFactory()
        except OperationalError as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database connection failed (attempt {attempt+1}/{max_retries}): {str(e)}")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Failed to connect to database after {max_retries} attempts: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Unexpected error creating database session: {str(e)}")
            raise


def close_db_session(session):
    """Close the database session safely."""
    if session:
        try:
            session.close()
        except Exception as e:
            logger.warning(f"Error closing database session: {str(e)}")


def execute_with_retry(db_func):
    """Decorator for database functions to add retry logic."""
    def wrapper(*args, **kwargs):
        max_retries = 3
        retry_delay = 1  # Start with 1 second delay
        
        for attempt in range(max_retries):
            try:
                result = db_func(*args, **kwargs)
                return result
            except OperationalError as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Database operation failed (attempt {attempt+1}/{max_retries}): {str(e)}")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error(f"Database operation failed after {max_retries} attempts: {str(e)}")
                    raise
            except Exception as e:
                logger.error(f"Unexpected error in database operation: {str(e)}")
                raise
    
    return wrapper


# User management functions
@execute_with_retry
def create_user(email, password_hash, name=None):
    """Create a new user in the database."""
    session = None
    try:
        session = get_db_session()
        user = User(email=email, password_hash=password_hash, name=name)
        session.add(user)
        session.commit()
        return user.id
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def get_user_by_email(email):
    """Get a user by email address."""
    session = None
    try:
        session = get_db_session()
        user = session.query(User).filter(User.email == email).first()
        return user.to_dict() if user else None
    except SQLAlchemyError as e:
        logger.error(f"Error getting user by email: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def get_user_by_id(user_id):
    """Get a user by ID."""
    session = None
    try:
        session = get_db_session()
        user = session.query(User).filter(User.id == user_id).first()
        return user.to_dict() if user else None
    except SQLAlchemyError as e:
        logger.error(f"Error getting user by ID: {str(e)}")
        raise
    finally:
        close_db_session(session)


# Assessment functions
@execute_with_retry
def save_assessment(user_id, responses_dict, scores_dict, analysis_dict=None):
    """Save an assessment to the database."""
    session = None
    try:
        session = get_db_session()
        assessment = Assessment(user_id=user_id)
        assessment.set_responses(responses_dict)
        assessment.set_scores(scores_dict)
        if analysis_dict:
            assessment.set_analysis(analysis_dict)
        
        session.add(assessment)
        session.commit()
        return assessment.id
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        logger.error(f"Error saving assessment: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def get_user_assessments(user_id):
    """Get all assessments for a user."""
    session = None
    try:
        session = get_db_session()
        assessments = session.query(Assessment).filter(Assessment.user_id == user_id).order_by(Assessment.completed_at.desc()).all()
        return [assessment.to_dict() for assessment in assessments]
    except SQLAlchemyError as e:
        logger.error(f"Error getting user assessments: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def get_assessment_by_id(assessment_id):
    """Get an assessment by ID."""
    session = None
    try:
        session = get_db_session()
        assessment = session.query(Assessment).filter(Assessment.id == assessment_id).first()
        return assessment.to_dict() if assessment else None
    except SQLAlchemyError as e:
        logger.error(f"Error getting assessment by ID: {str(e)}")
        raise
    finally:
        close_db_session(session)


# Chat functions
@execute_with_retry
def create_chat_session(user_id):
    """Create a new chat session."""
    session = None
    try:
        session = get_db_session()
        chat_session = ChatSession(user_id=user_id)
        session.add(chat_session)
        session.commit()
        return chat_session.id
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        logger.error(f"Error creating chat session: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def add_chat_message(session_id, role, content):
    """Add a message to a chat session."""
    session = None
    try:
        session = get_db_session()
        message = ChatMessage(session_id=session_id, role=role, content=content)
        session.add(message)
        session.commit()
        return message.id
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        logger.error(f"Error adding chat message: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def get_chat_sessions(user_id):
    """Get all chat sessions for a user."""
    session = None
    try:
        session = get_db_session()
        chat_sessions = session.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()
        return [chat_session.to_dict() for chat_session in chat_sessions]
    except SQLAlchemyError as e:
        logger.error(f"Error getting chat sessions: {str(e)}")
        raise
    finally:
        close_db_session(session)


@execute_with_retry
def get_chat_session(session_id):
    """Get a chat session by ID."""
    session = None
    try:
        session = get_db_session()
        chat_session = session.query(ChatSession).filter(ChatSession.id == session_id).first()
        return chat_session.to_dict() if chat_session else None
    except SQLAlchemyError as e:
        logger.error(f"Error getting chat session by ID: {str(e)}")
        raise
    finally:
        close_db_session(session)