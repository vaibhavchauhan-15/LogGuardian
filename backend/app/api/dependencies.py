from dataclasses import dataclass
from functools import lru_cache
import base64
import json
from typing import Optional
from uuid import UUID

from fastapi import Header, HTTPException

from app.core.config import get_settings
from app.services.dashboard_service import DashboardService
from app.services.alert_service import AlertService
from app.services.log_service import LogService
from app.services.ml_service import AnomalyService
from app.services.notification_service import NotificationService
from app.services.realtime_hub import RealtimeHub


@lru_cache
def get_anomaly_service() -> AnomalyService:
    settings = get_settings()
    return AnomalyService(
        model_path=settings.model_store_path,
        suspicious_threshold=settings.suspicious_threshold,
        critical_threshold=settings.critical_threshold,
        embedding_model_name=settings.sentence_transformer_model,
        enable_semantic_embeddings=settings.enable_semantic_embeddings,
    )


@lru_cache
def get_alert_service() -> AlertService:
    return AlertService()


@lru_cache
def get_realtime_hub() -> RealtimeHub:
    settings = get_settings()
    return RealtimeHub(buffer_size=settings.realtime_buffer_size)


@lru_cache
def get_notification_service() -> NotificationService:
    return NotificationService()


@lru_cache
def get_log_service() -> LogService:
    return LogService(get_anomaly_service())


@lru_cache
def get_dashboard_service() -> DashboardService:
    return DashboardService(get_anomaly_service())


@dataclass(frozen=True)
class RequestUserContext:
    user_id: str
    email: Optional[str] = None


def _normalize_uuid_user_id(value: str) -> Optional[str]:
    candidate = value.strip()
    if not candidate:
        return None

    if candidate.startswith("lg-dev-"):
        candidate = candidate[len("lg-dev-") :].strip()

    try:
        return str(UUID(candidate))
    except ValueError:
        return None


def get_request_user_context(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> RequestUserContext:
    user_id = _normalize_uuid_user_id(x_user_id or "") or ""
    email = (x_user_email or "").strip() or None

    if not user_id and authorization:
        token = authorization.strip()
        if token.lower().startswith("bearer "):
            token = token[7:].strip()

        parts = token.split(".")
        if len(parts) >= 2:
            payload = parts[1]
            padding = "=" * (-len(payload) % 4)
            normalized = payload.replace("-", "+").replace("_", "/") + padding
            try:
                decoded_payload = base64.b64decode(normalized).decode("utf-8")
                claims = json.loads(decoded_payload)
                claim_sub = _normalize_uuid_user_id(str(claims.get("sub") or ""))
                claim_email = str(claims.get("email") or "").strip() or None
                if claim_sub:
                    user_id = claim_sub
                if not email and claim_email:
                    email = claim_email
            except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
                pass

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid user identity (X-User-Id or Bearer token with UUID sub)",
        )

    return RequestUserContext(user_id=user_id, email=email)
