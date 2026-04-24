from typing import List

from pydantic import BaseModel


class ServiceBreakdown(BaseModel):
    service: str
    total: int
    critical: int


class TrendPoint(BaseModel):
    day: str
    total: int
    critical: int


class AnalyticsOverview(BaseModel):
    total_logs: int
    total_anomalies: int
    total_critical: int
    anomaly_rate: float
    top_services: List[ServiceBreakdown]
    trend: List[TrendPoint]
