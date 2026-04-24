from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.logs import ClassificationType, LogRecord


DashboardType = Literal["portfolio", "ecommerce", "saas", "api"]
DashboardHealth = Literal["healthy", "warning", "critical"]


class DashboardCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: DashboardType
    description: Optional[str] = Field(default=None, max_length=400)


class DashboardSummary(BaseModel):
    id: str
    user_id: str
    name: str
    type: DashboardType
    description: Optional[str] = None
    status: DashboardHealth
    total_logs_processed: int
    anomalies_detected: int
    critical_alerts: int
    anomaly_rate: float
    created_at: datetime
    last_updated: datetime


class DashboardListResponse(BaseModel):
    items: List[DashboardSummary]


class DashboardMetricsResponse(BaseModel):
    dashboard_id: str
    total_logs_processed: int
    anomalies_detected: int
    critical_alerts: int
    anomaly_rate: float
    status: DashboardHealth
    last_updated: datetime
    trend: List[dict]
    recent_logs: List[LogRecord]
    alerts: List[LogRecord]


class LogSessionRecord(BaseModel):
    id: str
    dashboard_id: str
    logs_count: int
    anomalies_found: int
    critical_alerts: int
    created_at: datetime


class LogSessionIngestResponse(BaseModel):
    session: LogSessionRecord
    logs: List[LogRecord]
