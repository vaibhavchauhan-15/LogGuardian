from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from dateutil import parser

from app.core.config import get_settings
from app.schemas.alerts import AlertListResponse, AlertRecord
from app.schemas.logs import LogRecord
from app.services.supabase_client import get_supabase_client


class AlertService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = get_supabase_client()
        self.table = self.settings.supabase_alerts_table
        self._cached_user_id: Optional[str] = None
        self._cached_project_id: Optional[str] = None

    @staticmethod
    def _priority(classification: str, score: float) -> str:
        if classification == "critical" or score >= 0.9:
            return "critical"
        if classification == "suspicious" or score >= 0.65:
            return "high"
        if score >= 0.4:
            return "medium"
        return "low"

    @staticmethod
    def _digest(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]

    def _resolve_tenant(self) -> tuple[str, Optional[str]]:
        if self._cached_user_id is not None:
            return self._cached_user_id, self._cached_project_id

        user_id = (self.settings.supabase_default_user_id or "").strip()
        if not user_id:
            user_result = (
                self.client.table("users")
                .select("id")
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
            if not user_result.data:
                bootstrap_email = self.settings.supabase_bootstrap_user_email.strip().lower()
                created_user = None
                try:
                    created_user = (
                        self.client.table("users")
                        .insert(
                            {
                                "email": bootstrap_email,
                                "plan": "free",
                            }
                        )
                        .execute()
                    )
                except Exception:
                    created_user = None
                if created_user and created_user.data:
                    user_id = str(created_user.data[0].get("id"))
                else:
                    user_retry = (
                        self.client.table("users")
                        .select("id")
                        .order("created_at", desc=False)
                        .limit(1)
                        .execute()
                    )
                    if not user_retry.data:
                        raise RuntimeError(
                            "No users found and bootstrap user creation failed. Configure SUPABASE_DEFAULT_USER_ID or seed public.users."
                        )
                    user_id = str(user_retry.data[0].get("id"))
            else:
                user_id = str(user_result.data[0].get("id"))

        configured_project_id = (self.settings.supabase_default_project_id or "").strip()
        if configured_project_id:
            project_id: Optional[str] = configured_project_id
        else:
            project_result = (
                self.client.table("projects")
                .select("id")
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
            project_id = str(project_result.data[0].get("id")) if project_result.data else None

        self._cached_user_id = user_id
        self._cached_project_id = project_id
        return user_id, project_id

    @staticmethod
    def _scope_query(query, user_id: str, project_id: Optional[str]):
        query = query.eq("user_id", user_id)
        if project_id is None:
            return query.is_("project_id", "null")
        return query.eq("project_id", project_id)

    @staticmethod
    def _api_status(db_status: str) -> str:
        return "pending" if db_status == "active" else "resolved"

    @staticmethod
    def _db_status(api_status: Optional[str]) -> Optional[str]:
        if not api_status:
            return None
        if api_status == "pending":
            return "active"
        return api_status

    def _dedupe_key(self, record: LogRecord) -> str:
        compact_msg = " ".join(record.message.lower().split())[:180]
        signature = f"{record.service.lower()}|{record.classification}|{compact_msg}"
        return self._digest(signature)

    def _group_key(self, record: LogRecord) -> str:
        return f"{record.service.lower()}:{record.classification}"

    @staticmethod
    def _alert_type(record: LogRecord) -> str:
        normalized_level = (record.level or "").upper()
        if normalized_level in {"ERROR", "CRITICAL"}:
            return "error"
        if normalized_level == "WARN":
            return "warning"
        return "anomaly"

    def _title(self, record: LogRecord) -> str:
        prefix = "Critical" if record.classification == "critical" else "Suspicious"
        return f"{prefix} anomaly in {record.service}"

    def _to_record(self, row: dict) -> AlertRecord:
        now = datetime.now(timezone.utc)
        created_at = parser.isoparse(row.get("created_at")) if row.get("created_at") else now
        last_seen_at = parser.isoparse(row.get("last_seen_at")) if row.get("last_seen_at") else created_at
        return AlertRecord(
            id=str(row.get("id")),
            created_at=created_at,
            updated_at=last_seen_at,
            service=row.get("service") or "unknown",
            classification=row.get("type") or "anomaly",
            priority=row.get("severity") or "high",
            status=self._api_status(row.get("status") or "active"),
            title=row.get("title") or "Anomaly alert",
            message=row.get("message_preview") or "",
            dedupe_key=row.get("dedupe_key") or "",
            group_key=f"{row.get('service') or 'unknown'}:{row.get('type') or 'anomaly'}",
            occurrence_count=int(row.get("occurrence_count") or 1),
            last_seen_at=last_seen_at,
        )

    def process_log(self, record: LogRecord) -> Optional[AlertRecord]:
        if record.classification != "critical":
            return None
        try:
            now = datetime.now(timezone.utc)
            user_id, project_id = self._resolve_tenant()
            dedupe_key = self._dedupe_key(record)
            dedupe_since = now - timedelta(seconds=max(30, self.settings.alert_dedupe_window_seconds))

            existing_query = self.client.table(self.table).select("*")
            existing_query = self._scope_query(existing_query, user_id, project_id)
            existing = (
                existing_query.eq("dedupe_key", dedupe_key)
                .eq("status", "active")
                .gte("last_seen_at", dedupe_since.isoformat())
                .order("last_seen_at", desc=True)
                .limit(1)
                .execute()
            )

            if existing.data:
                current = existing.data[0]
                new_count = int(current.get("occurrence_count") or 1) + 1
                updated = (
                    self.client.table(self.table)
                    .update(
                        {
                            "occurrence_count": new_count,
                            "last_seen_at": now.isoformat(),
                            "message_preview": record.message[:200],
                            "title": self._title(record),
                            "severity": self._priority(record.classification, record.anomaly_score),
                        }
                    )
                    .eq("id", current.get("id"))
                    .eq("created_at", current.get("created_at"))
                    .execute()
                )
                if updated.data:
                    return self._to_record(updated.data[0])
                return self._to_record(current)

            row = {
                "user_id": user_id,
                "project_id": project_id,
                "service": record.service,
                "type": self._alert_type(record),
                "severity": self._priority(record.classification, record.anomaly_score),
                "status": "active",
                "title": self._title(record),
                "message_preview": record.message[:200],
                "dedupe_key": dedupe_key,
                "occurrence_count": 1,
                "first_seen_at": now.isoformat(),
                "last_seen_at": now.isoformat(),
                "created_at": now.isoformat(),
            }
            created = self.client.table(self.table).insert(row).execute()
            if not created.data:
                return None
            return self._to_record(created.data[0])
        except Exception:
            return None

    def list_alerts(
        self,
        page: int = 1,
        page_size: int = 25,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        service: Optional[str] = None,
    ) -> AlertListResponse:
        user_id, project_id = self._resolve_tenant()
        start = (page - 1) * page_size
        end = start + page_size - 1

        query = self.client.table(self.table).select("*", count="exact")
        query = self._scope_query(query, user_id, project_id)

        db_status = self._db_status(status)
        if db_status:
            query = query.eq("status", db_status)
        if priority:
            query = query.eq("severity", priority)
        if service:
            query = query.eq("service", service)

        result = query.order("last_seen_at", desc=True).range(start, end).execute()
        items = [self._to_record(row) for row in (result.data or [])]
        total = int(result.count or 0)
        return AlertListResponse(items=items, total=total, page=page, page_size=page_size)

    def resolve_alert(self, alert_id: str) -> Optional[AlertRecord]:
        user_id, project_id = self._resolve_tenant()
        lookup = self.client.table(self.table).select("id,created_at")
        lookup = self._scope_query(lookup, user_id, project_id)
        existing = lookup.eq("id", alert_id).order("created_at", desc=True).limit(1).execute()
        if not existing.data:
            return None

        current = existing.data[0]
        result = (
            self.client.table(self.table)
            .update({"status": "resolved"})
            .eq("id", current.get("id"))
            .eq("created_at", current.get("created_at"))
            .execute()
        )
        if not result.data:
            return None
        return self._to_record(result.data[0])
