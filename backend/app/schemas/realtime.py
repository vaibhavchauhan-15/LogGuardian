from datetime import datetime, timezone
from typing import Any, Dict, Literal

from pydantic import BaseModel, Field


RealtimeEventType = Literal["connected", "log_ingested", "alert_created", "heartbeat"]


class RealtimeEvent(BaseModel):
    event: RealtimeEventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payload: Dict[str, Any] = Field(default_factory=dict)
