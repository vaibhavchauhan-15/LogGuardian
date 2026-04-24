from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from dateutil import parser

from app.core.config import get_settings
from app.schemas.analytics import AnalyticsOverview, ServiceBreakdown, TrendPoint
from app.schemas.logs import LogIngestRequest, LogListResponse, LogRecord
from app.services.ml_service import AnomalyService
from app.services.supabase_client import get_supabase_client


class LogService:
    def __init__(self, anomaly_service: AnomalyService) -> None:
        self.settings = get_settings()
        self.client = get_supabase_client()
        self.anomalies_table = self.settings.supabase_anomalies_table
        self.analytics_minute_table = self.settings.supabase_analytics_minute_table
        self.anomaly_service = anomaly_service
        self._cached_user_id: Optional[str] = None
        self._cached_project_id: Optional[str] = None

    @staticmethod
    def _normalize_level(level: str) -> str:
        normalized = level.strip().upper()
        aliases = {
            "WARNING": "WARN",
            "ERR": "ERROR",
            "CRIT": "CRITICAL",
        }
        return aliases.get(normalized, normalized)

    @staticmethod
    def _level_from_classification(classification: str) -> str:
        if classification == "critical":
            return "CRITICAL"
        if classification == "suspicious":
            return "WARN"
        return "INFO"

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

    def _build_signal(self, payload: LogIngestRequest) -> dict:
        timestamp = payload.timestamp or datetime.now(timezone.utc)
        score = self.anomaly_service.score(payload.message)

        return {
            "id": str(uuid4()),
            "timestamp": timestamp,
            "service": payload.service.strip() or "unknown",
            "level": self._normalize_level(payload.level),
            "message": payload.message.strip(),
            "anomaly_score": score.anomaly_score,
            "classification": score.classification,
            "explanation": score.explanation,
            "model_breakdown": score.model_breakdown,
        }

    @staticmethod
    def _scope_query(query, user_id: str, project_id: Optional[str]):
        query = query.eq("user_id", user_id)
        if project_id is None:
            return query.is_("project_id", "null")
        return query.eq("project_id", project_id)

    def _write_anomalies(self, signals: list[dict], user_id: str, project_id: Optional[str]) -> dict[str, dict]:
        anomaly_rows = []
        for row in signals:
            if row.get("classification") == "normal":
                continue
            anomaly_rows.append(
                {
                    "user_id": user_id,
                    "project_id": project_id,
                    "service": row.get("service"),
                    "anomaly_score": row.get("anomaly_score"),
                    "classification": row.get("classification"),
                    "message_preview": str(row.get("message") or "")[:200],
                    "created_at": row.get("timestamp").isoformat(),
                }
            )

        if not anomaly_rows:
            return {}

        try:
            inserted = self.client.table(self.anomalies_table).insert(anomaly_rows).execute().data or []
            index: dict[str, dict] = {}
            for row in inserted:
                created_at = row.get("created_at")
                service = row.get("service")
                classification = row.get("classification")
                anomaly_score = row.get("anomaly_score")
                key = f"{created_at}|{service}|{classification}|{anomaly_score}"
                index[key] = row
            return index
        except Exception:
            # Keep ingestion path resilient even if anomalies table is not provisioned yet.
            return {}

    def _upsert_minute_analytics(self, signals: list[dict], user_id: str, project_id: Optional[str]) -> None:
        rollups: dict[tuple[str, datetime], dict[str, int]] = defaultdict(
            lambda: {
                "total_logs": 0,
                "error_count": 0,
                "warning_count": 0,
                "anomaly_count": 0,
            }
        )

        for signal in signals:
            ts: datetime = signal["timestamp"]
            bucket = ts.replace(second=0, microsecond=0)
            key = (str(signal.get("service") or "unknown"), bucket)
            stats = rollups[key]
            stats["total_logs"] += 1

            is_anomaly = signal.get("classification") != "normal"
            if is_anomaly:
                stats["anomaly_count"] += 1
                continue

            level = str(signal.get("level") or "INFO")
            if level in {"ERROR", "CRITICAL"}:
                stats["error_count"] += 1
            elif level == "WARN":
                stats["warning_count"] += 1

        for (service, bucket), increments in rollups.items():
            query = (
                self.client.table(self.analytics_minute_table)
                .select("id,total_logs,error_count,warning_count,anomaly_count")
                .eq("user_id", user_id)
                .eq("service", service)
                .eq("minute_bucket", bucket.isoformat())
            )
            if project_id is None:
                query = query.is_("project_id", "null")
            else:
                query = query.eq("project_id", project_id)

            existing = query.limit(1).execute()
            if existing.data:
                row = existing.data[0]
                self.client.table(self.analytics_minute_table).update(
                    {
                        "total_logs": int(row.get("total_logs") or 0) + increments["total_logs"],
                        "error_count": int(row.get("error_count") or 0) + increments["error_count"],
                        "warning_count": int(row.get("warning_count") or 0) + increments["warning_count"],
                        "anomaly_count": int(row.get("anomaly_count") or 0) + increments["anomaly_count"],
                    }
                ).eq("id", row.get("id")).execute()
                continue

            self.client.table(self.analytics_minute_table).insert(
                {
                    "user_id": user_id,
                    "project_id": project_id,
                    "service": service,
                    "minute_bucket": bucket.isoformat(),
                    **increments,
                }
            ).execute()

    def ingest_one(self, payload: LogIngestRequest) -> LogRecord:
        user_id, project_id = self._resolve_tenant()
        signal = self._build_signal(payload)
        anomaly_index = self._write_anomalies([signal], user_id, project_id)
        self._upsert_minute_analytics([signal], user_id, project_id)
        return self._record_from_signal(signal, anomaly_index)

    def ingest_many(self, payloads: list[LogIngestRequest]) -> list[LogRecord]:
        signals = [self._build_signal(item) for item in payloads]
        if not signals:
            return []

        user_id, project_id = self._resolve_tenant()
        anomaly_index = self._write_anomalies(signals, user_id, project_id)
        self._upsert_minute_analytics(signals, user_id, project_id)
        return [self._record_from_signal(signal, anomaly_index) for signal in signals]

    def list_logs(
        self,
        page: int = 1,
        page_size: int = 20,
        level: Optional[str] = None,
        service: Optional[str] = None,
        classification: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> LogListResponse:
        user_id, project_id = self._resolve_tenant()
        start = (page - 1) * page_size
        end = start + page_size - 1

        query = self.client.table(self.anomalies_table).select("*", count="exact")
        query = self._scope_query(query, user_id, project_id)

        effective_classification = classification.lower() if classification else None
        if level and not effective_classification:
            normalized = self._normalize_level(level)
            if normalized in {"DEBUG", "INFO"}:
                effective_classification = "normal"
            elif normalized == "WARN":
                effective_classification = "suspicious"
            elif normalized in {"ERROR", "CRITICAL"}:
                effective_classification = "critical"

        if service:
            query = query.eq("service", service)
        if effective_classification:
            query = query.eq("classification", effective_classification)
        if start_time:
            query = query.gte("created_at", start_time.isoformat())
        if end_time:
            query = query.lte("created_at", end_time.isoformat())

        response = query.order("created_at", desc=True).range(start, end).execute()
        items = [self._record_from_anomaly_row(row) for row in (response.data or [])]
        total = int(response.count or 0)

        return LogListResponse(items=items, total=total, page=page, page_size=page_size)

    def fetch_messages_for_training(self, max_rows: int = 1500) -> list[str]:
        user_id, project_id = self._resolve_tenant()
        anomalies_limit = max(100, int(max_rows * 0.7))
        alerts_limit = max(50, max_rows - anomalies_limit)

        anomalies_query = self.client.table(self.anomalies_table).select("message_preview")
        anomalies_query = self._scope_query(anomalies_query, user_id, project_id)
        anomalies_response = anomalies_query.order("created_at", desc=True).limit(anomalies_limit).execute()

        alerts_query = self.client.table(self.settings.supabase_alerts_table).select("message_preview")
        alerts_query = self._scope_query(alerts_query, user_id, project_id)
        alerts_response = alerts_query.order("last_seen_at", desc=True).limit(alerts_limit).execute()

        messages: list[str] = []
        for row in anomalies_response.data or []:
            value = str(row.get("message_preview") or "").strip()
            if value:
                messages.append(value)
        for row in alerts_response.data or []:
            value = str(row.get("message_preview") or "").strip()
            if value:
                messages.append(value)

        return messages[:max_rows]

    def analytics_overview(self, days: int = 14) -> AnalyticsOverview:
        user_id, project_id = self._resolve_tenant()
        since = datetime.now(timezone.utc) - timedelta(days=days)
        analytics_query = self.client.table(self.analytics_minute_table).select("service,minute_bucket,total_logs,anomaly_count")
        analytics_query = self._scope_query(analytics_query, user_id, project_id)
        analytics_response = (
            analytics_query.gte("minute_bucket", since.isoformat())
            .order("minute_bucket", desc=False)
            .limit(10000)
            .execute()
        )

        critical_query = self.client.table(self.anomalies_table).select("service,created_at")
        critical_query = self._scope_query(critical_query, user_id, project_id)
        critical_response = (
            critical_query.eq("classification", "critical")
            .gte("created_at", since.isoformat())
            .order("created_at", desc=False)
            .limit(5000)
            .execute()
        )

        rows = analytics_response.data or []
        critical_rows = critical_response.data or []

        total_logs = sum(int(row.get("total_logs") or 0) for row in rows)
        total_anomalies = sum(int(row.get("anomaly_count") or 0) for row in rows)
        total_critical = len(critical_rows)
        anomaly_rate = round((total_anomalies / total_logs) * 100, 2) if total_logs else 0.0

        service_totals: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "critical": 0})
        trend_totals: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "critical": 0})

        for row in rows:
            service_name = row.get("service") or "unknown"
            service_totals[service_name]["total"] += int(row.get("total_logs") or 0)

            minute_bucket = row.get("minute_bucket")
            if not minute_bucket:
                continue
            parsed = parser.isoparse(minute_bucket)
            day_key = parsed.date().isoformat()
            trend_totals[day_key]["total"] += int(row.get("total_logs") or 0)

        for row in critical_rows:
            service_name = row.get("service") or "unknown"
            service_totals[service_name]["critical"] += 1
            created_at = row.get("created_at")
            if not created_at:
                continue
            parsed = parser.isoparse(created_at)
            day_key = parsed.date().isoformat()
            trend_totals[day_key]["critical"] += 1

        top_services = sorted(
            [
                ServiceBreakdown(service=name, total=stats["total"], critical=stats["critical"])
                for name, stats in service_totals.items()
            ],
            key=lambda item: item.total,
            reverse=True,
        )[:6]

        trend = [
            TrendPoint(day=day, total=values["total"], critical=values["critical"])
            for day, values in sorted(trend_totals.items())
        ]

        return AnalyticsOverview(
            total_logs=total_logs,
            total_anomalies=total_anomalies,
            total_critical=total_critical,
            anomaly_rate=anomaly_rate,
            top_services=top_services,
            trend=trend,
        )

    @staticmethod
    def _record_from_anomaly_row(row: dict) -> LogRecord:
        classification = row.get("classification") or "normal"
        return LogRecord(
            id=str(row.get("id")),
            timestamp=parser.isoparse(row.get("created_at")) if row.get("created_at") else datetime.now(timezone.utc),
            service=row.get("service") or "unknown",
            level=LogService._level_from_classification(classification),
            message=row.get("message_preview") or "",
            anomaly_score=float(row.get("anomaly_score") or 0.0),
            classification=classification,
            explanation=None,
            model_breakdown=None,
            created_at=parser.isoparse(row.get("created_at")) if row.get("created_at") else None,
        )

    @staticmethod
    def _record_from_signal(signal: dict, anomaly_index: dict[str, dict]) -> LogRecord:
        timestamp: datetime = signal["timestamp"]
        signal_key = (
            f"{timestamp.isoformat()}|{signal.get('service')}|"
            f"{signal.get('classification')}|{signal.get('anomaly_score')}"
        )
        anomaly_row = anomaly_index.get(signal_key)
        created_at = (
            parser.isoparse(anomaly_row.get("created_at"))
            if anomaly_row and anomaly_row.get("created_at")
            else timestamp
        )
        return LogRecord(
            id=str(anomaly_row.get("id") if anomaly_row else signal.get("id") or uuid4()),
            timestamp=timestamp,
            service=str(signal.get("service") or "unknown"),
            level=str(signal.get("level") or "INFO"),
            message=str(signal.get("message") or ""),
            anomaly_score=float(signal.get("anomaly_score") or 0.0),
            classification=str(signal.get("classification") or "normal"),
            explanation=signal.get("explanation"),
            model_breakdown=signal.get("model_breakdown") if isinstance(signal.get("model_breakdown"), dict) else None,
            created_at=created_at,
        )
