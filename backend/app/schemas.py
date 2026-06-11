"""Pydantic v2 schemas."""
from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class HealthResp(BaseModel):
    status: Literal["ok"] = "ok"
    ai_enabled: bool


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    focus_min: int
    short_break_min: int
    long_break_min: int
    long_break_interval: int
    ai_enabled: bool


class SettingsUpdate(BaseModel):
    focus_min: Optional[int] = Field(default=None, ge=1, le=240)
    short_break_min: Optional[int] = Field(default=None, ge=1, le=60)
    long_break_min: Optional[int] = Field(default=None, ge=1, le=120)
    long_break_interval: Optional[int] = Field(default=None, ge=2, le=12)


class QACase(BaseModel):
    question: str
    answer: str
    tag: Optional[str] = None


class SessionCreate(BaseModel):
    mode: Literal["free", "pomodoro"]
    started_at: datetime
    ended_at: datetime
    duration_sec: int = Field(ge=0)
    focus_count: int = Field(default=0, ge=0)
    note: Optional[str] = None
    summary: Optional[str] = None
    summary_structured: Optional[Dict] = None
    auto_qa: List[QACase] = Field(default_factory=list)


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mode: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_sec: int
    focus_count: int
    note: Optional[str]
    summary: Optional[str]
    summary_structured: Optional[str]


class SessionPatch(BaseModel):
    note: Optional[str] = None
    summary: Optional[str] = None
    summary_structured: Optional[Dict] = None


class CardCreate(QACase):
    source: Literal["manual", "ai", "session"] = "manual"
    session_id: Optional[int] = None


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question: str
    answer: str
    tag: Optional[str]
    source: str
    session_id: Optional[int]
    mastery: int
    favorited: bool
    created_at: datetime
    last_reviewed_at: Optional[datetime]
    next_review_at: Optional[datetime]
    interval_days: int


class CardUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    tag: Optional[str] = None
    favorited: Optional[bool] = None
    mastery: Optional[int] = Field(default=None, ge=0, le=5)


class CardReviewIn(BaseModel):
    passed: bool


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    priority: int = Field(default=1, ge=0, le=2)
    due_at: Optional[datetime] = None


class TodoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    priority: int
    due_at: Optional[datetime]
    completed: bool
    completed_at: Optional[datetime]
    created_at: datetime


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    priority: Optional[int] = Field(default=None, ge=0, le=2)
    due_at: Optional[datetime] = None
    completed: Optional[bool] = None


class SummarizeIn(BaseModel):
    note: str = Field(min_length=1)
    duration_sec: int = Field(default=0, ge=0)


class SummarizeOut(BaseModel):
    summary: str
    key_points: List[str]
    suggestions: List[str]


class ExtractQAIn(BaseModel):
    text: str = Field(min_length=1)


class ExtractQAOut(BaseModel):
    cards: List[QACase]


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None
    study_session_id: Optional[int] = None


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    study_session_id: Optional[int]
    message_count: Optional[int] = 0


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    role: str
    content: str
    meta: Optional[str]
    created_at: datetime


class ChatSessionDetail(BaseModel):
    session: ChatSessionOut
    messages: List[ChatMessageOut]


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    context: Optional[str] = None


class PostMessageOut(BaseModel):
    user: ChatMessageOut
    assistant: ChatMessageOut



class ConceptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: Optional[str]
    concept_group: Optional[str]
    description: str
    status: str
    confidence: float
    source_session_id: Optional[int]
    source_message_ids: Optional[str]
    created_at: datetime
    updated_at: datetime


class ConceptUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    concept_group: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["active", "archived"]] = None


class ConceptCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1)
    category: Optional[str] = None
    concept_group: Optional[str] = None
    source_session_id: Optional[int] = None
    source_message_ids: Optional[List[int]] = None


class ExtractedConcept(BaseModel):
    name: str
    description: str
    category: Optional[str] = None


class ExtractConceptsOut(BaseModel):
    concepts: List["ExtractedConcept"]


class ConceptGroup(BaseModel):
    group: str
    description: Optional[str] = None
    concept_ids: List[int]


class RenameSuggestion(BaseModel):
    id: int
    new_name: str
    reason: Optional[str] = None


class ReorganizeOut(BaseModel):
    groups: List["ConceptGroup"]
    suggested_renames: List["RenameSuggestion"] = Field(default_factory=list)
    duplicates: List[List[int]] = Field(default_factory=list)


ExtractConceptsOut.model_rebuild()