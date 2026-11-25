from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    session_id: int
    reply: str
    messages: List[ChatMessage]


class ChatSessionOut(BaseModel):
    id: int
    title: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
