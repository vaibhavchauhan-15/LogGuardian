from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


AlertPriority = Literal["low", "medium", "high", "critical"]
AlertStatus = Literal["pending", "resolved"]


class AlertRecord(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    service: str
    classification: str
    priority: AlertPriority
    status: AlertStatus
    title: str
    message: str
    dedupe_key: str
    group_key: str
    occurrence_count: int
    last_seen_at: datetime


class AlertListResponse(BaseModel):
    items: List[AlertRecord]
    total: int
    page: int
    page_size: int


class AlertResolveRequest(BaseModel):
    resolved_by: str = Field(default="system", min_length=1, max_length=80)


class AlertResolveResponse(BaseModel):
    success: bool
    alert: Optional[AlertRecord] = None
