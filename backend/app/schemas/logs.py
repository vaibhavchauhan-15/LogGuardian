from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


ClassificationType = Literal["normal", "suspicious", "critical"]


class LogIngestRequest(BaseModel):
    dashboard_id: str = Field(min_length=1, max_length=60)
    timestamp: datetime
    service: str = Field(default="unknown", min_length=1, max_length=120)
    level: str = Field(default="INFO", min_length=1, max_length=30)
    message: str = Field(min_length=1, max_length=6000)


class LogRecord(BaseModel):
    id: str
    dashboard_id: str
    timestamp: datetime
    service: str
    level: str
    message: str
    anomaly_score: float
    severity: ClassificationType
    classification: ClassificationType
    explanation: Optional[str] = None
    model_breakdown: Optional[dict[str, float]] = None
    created_at: Optional[datetime] = None


class LogListResponse(BaseModel):
    items: List[LogRecord]
    total: int
    page: int
    page_size: int


class UploadResponse(BaseModel):
    ingested: int
    skipped: int
    trained: bool


class BatchIngestRequest(BaseModel):
    logs: List[LogIngestRequest] = Field(min_length=1, max_length=5000)


class BatchIngestResponse(BaseModel):
    ingested: int
    skipped: int
    processing_ms: int


class LogIngestSummary(BaseModel):
    log: LogRecord
    alert_triggered: bool = False


class ModelTrainResponse(BaseModel):
    trained: bool
    samples_used: int
    message: str


class ModelStatusResponse(BaseModel):
    trained: bool
    model_path: str
    trained_at: Optional[str] = None
