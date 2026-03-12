from pydantic import BaseModel
from typing import List, Optional


class AIQueryRequest(BaseModel):
    query: str
    top: int = 20


class EnrichedEmail(BaseModel):
    id: str
    subject: str
    from_name: str
    from_address: str
    received_datetime: str
    body_preview: str
    body_content: str
    is_read: bool
    importance: str
    # Enrichment fields
    priority_score: Optional[int] = None         # 1–10
    priority_reason: Optional[str] = None
    contract_tags: Optional[List[str]] = []
    project_tags: Optional[List[str]] = []
    needs_reply: Optional[bool] = False
    reply_urgency: Optional[str] = "low"         # low | medium | high | critical
    sender_role: Optional[str] = None            # e.g. "Contracting Officer"
    detected_deadline: Optional[str] = None      # ISO date string if found


class EnrichmentResult(BaseModel):
    id: str
    priority_score: int
    priority_reason: str
    contract_tags: List[str]
    project_tags: List[str]
    needs_reply: bool
    reply_urgency: str
    sender_role: str
    detected_deadline: Optional[str] = None
