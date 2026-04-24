from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from dateutil import parser

from app.core.config import get_settings
from app.schemas.analytics import AnalyticsOverview, ServiceBreakdown, TrendPoint
from app.schemas.dashboards import (
    DashboardCreateRequest,
    DashboardListResponse,
    DashboardMetricsResponse,
    DashboardSummary,
    LogSessionIngestResponse,
    LogSessionRecord,
)
from app.schemas.logs import LogIngestRequest, LogListResponse, LogRecord
from app.services.ml_service import AnomalyService
from app.services.supabase_client import get_supabase_client


class DashboardService:
    def __init__(self, anomaly_service: AnomalyService) -> None:
        self.settings = get_settings()
        self.client = get_supabase_client()
        self.anomaly_service = anomaly_service

        self.users_table = "users"
        self.dashboards_table = "dashboards"
        self.metrics_table = "dashboard_metrics"
        self.sessions_table = "log_sessions"

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
    def _compute_status(anomaly_rate: float, critical_alerts: int) -> str:
        if critical_alerts > 0 and anomaly_rate >= 8:
            return "critical"
        if anomaly_rate >= 3:
            return "warning"
        return "healthy"

    def _ensure_user_exists(self, user_id: str, email: Optional[str]) -> None:
        existing = (
            self.client.table(self.users_table)
            .select("id")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return

        fallback_email = f"{user_id}@logguardian.local"
        try:
            self.client.table(self.users_table).insert(
                {
                    "id": user_id,
                    "email": (email or fallback_email).strip().lower(),
                    "plan": "free",
                }
            ).execute()
        except Exception:
            # If another request created the user concurrently, keep request flow resilient.
            return

    def _get_dashboard_or_raise(self, user_id: str, dashboard_id: str) -> dict[str, Any]:
        result = (
            self.client.table(self.dashboards_table)
            .select("*")
            .eq("id", dashboard_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise ValueError("Dashboard not found for this user")
        return result.data[0]

    def _get_metrics_row(self, dashboard_id: str) -> dict[str, Any]:
        result = (
            self.client.table(self.metrics_table)
            .select("*")
            .eq("dashboard_id", dashboard_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]

        now_iso = datetime.now(timezone.utc).isoformat()
        inserted = (
            self.client.table(self.metrics_table)
            .insert(
                {
                    "dashboard_id": dashboard_id,
                    "total_logs_processed": 0,
                    "anomalies_detected": 0,
                    "critical_alerts": 0,
                    "anomaly_rate": 0,
                    "time_series_data": [],
                    "last_50_logs_preview": [],
                    "last_updated": now_iso,
                }
            )
            .execute()
        )
        if inserted.data:
            return inserted.data[0]

        retry = (
            self.client.table(self.metrics_table)
            .select("*")
            .eq("dashboard_id", dashboard_id)
            .limit(1)
            .execute()
        )
        if retry.data:
            return retry.data[0]

        raise RuntimeError("Unable to initialize dashboard metrics")

    @staticmethod
    def _as_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc)
        if isinstance(value, str) and value:
            return parser.isoparse(value).astimezone(timezone.utc)
        return datetime.now(timezone.utc)

    def _signal_from_payload(self, payload: LogIngestRequest) -> dict[str, Any]:
        score = self.anomaly_service.score(payload.message)
        timestamp = self._as_datetime(payload.timestamp)
        severity = score.classification
        return {
            "id": str(uuid4()),
            "dashboard_id": payload.dashboard_id,
            "timestamp": timestamp,
            "service": payload.service.strip() or "unknown",
            "level": self._normalize_level(payload.level),
            "message": payload.message.strip(),
            "anomaly_score": float(score.anomaly_score),
            "severity": severity,
            "classification": severity,
            "explanation": score.explanation,
            "model_breakdown": score.model_breakdown,
        }

    def _record_from_preview(self, preview: dict[str, Any]) -> LogRecord:
        ts_value = preview.get("timestamp")
        created_at = self._as_datetime(ts_value)
        severity = str(preview.get("severity") or preview.get("classification") or "normal")
        return LogRecord(
            id=str(preview.get("id") or uuid4()),
            dashboard_id=str(preview.get("dashboard_id") or ""),
            timestamp=created_at,
            service=str(preview.get("service") or "unknown"),
            level=str(preview.get("level") or "INFO"),
            message=str(preview.get("message") or ""),
            anomaly_score=float(preview.get("anomaly_score") or 0.0),
            severity=severity,  # type: ignore[arg-type]
            classification=severity,  # type: ignore[arg-type]
            explanation=preview.get("explanation"),
            model_breakdown=preview.get("model_breakdown") if isinstance(preview.get("model_breakdown"), dict) else None,
            created_at=created_at,
        )

    def _record_from_signal(self, signal: dict[str, Any]) -> LogRecord:
        ts = signal["timestamp"]
        severity = str(signal.get("severity") or signal.get("classification") or "normal")
        return LogRecord(
            id=str(signal.get("id") or uuid4()),
            dashboard_id=str(signal.get("dashboard_id") or ""),
            timestamp=ts,
            service=str(signal.get("service") or "unknown"),
            level=str(signal.get("level") or "INFO"),
            message=str(signal.get("message") or ""),
            anomaly_score=float(signal.get("anomaly_score") or 0.0),
            severity=severity,  # type: ignore[arg-type]
            classification=severity,  # type: ignore[arg-type]
            explanation=signal.get("explanation"),
            model_breakdown=signal.get("model_breakdown") if isinstance(signal.get("model_breakdown"), dict) else None,
            created_at=ts,
        )

    def create_dashboard(self, user_id: str, email: Optional[str], payload: DashboardCreateRequest) -> DashboardSummary:
        self._ensure_user_exists(user_id, email)

        created = (
            self.client.table(self.dashboards_table)
            .insert(
                {
                    "user_id": user_id,
                    "name": payload.name.strip(),
                    "type": payload.type,
                    "description": (payload.description or "").strip() or None,
                }
            )
            .execute()
        )
        if not created.data:
            raise RuntimeError("Failed to create dashboard")

        row = created.data[0]
        self._get_metrics_row(str(row.get("id")))

        created_at = self._as_datetime(row.get("created_at"))
        return DashboardSummary(
            id=str(row.get("id")),
            user_id=str(row.get("user_id")),
            name=str(row.get("name") or ""),
            type=str(row.get("type") or "saas"),  # type: ignore[arg-type]
            description=row.get("description"),
            status="healthy",
            total_logs_processed=0,
            anomalies_detected=0,
            critical_alerts=0,
            anomaly_rate=0,
            created_at=created_at,
            last_updated=created_at,
        )

    def list_dashboards(self, user_id: str, email: Optional[str]) -> DashboardListResponse:
        self._ensure_user_exists(user_id, email)

        dashboards = (
            self.client.table(self.dashboards_table)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

        dashboard_ids = [str(row.get("id")) for row in dashboards if row.get("id")]
        metrics_rows: dict[str, dict[str, Any]] = {}
        if dashboard_ids:
            metric_data = (
                self.client.table(self.metrics_table)
                .select("*")
                .in_("dashboard_id", dashboard_ids)
                .execute()
            ).data or []
            metrics_rows = {str(row.get("dashboard_id")): row for row in metric_data if row.get("dashboard_id")}

        items: list[DashboardSummary] = []
        for row in dashboards:
            dashboard_id = str(row.get("id"))
            metrics = metrics_rows.get(dashboard_id, {})
            total_logs = int(metrics.get("total_logs_processed") or 0)
            anomalies = int(metrics.get("anomalies_detected") or 0)
            critical = int(metrics.get("critical_alerts") or 0)
            anomaly_rate = float(metrics.get("anomaly_rate") or 0.0)

            last_updated = self._as_datetime(metrics.get("last_updated") or row.get("created_at"))
            created_at = self._as_datetime(row.get("created_at"))

            items.append(
                DashboardSummary(
                    id=dashboard_id,
                    user_id=str(row.get("user_id")),
                    name=str(row.get("name") or ""),
                    type=str(row.get("type") or "saas"),  # type: ignore[arg-type]
                    description=row.get("description"),
                    status=self._compute_status(anomaly_rate, critical),  # type: ignore[arg-type]
                    total_logs_processed=total_logs,
                    anomalies_detected=anomalies,
                    critical_alerts=critical,
                    anomaly_rate=round(anomaly_rate, 2),
                    created_at=created_at,
                    last_updated=last_updated,
                )
            )

        return DashboardListResponse(items=items)

    def _merge_time_series(self, existing: list[dict[str, Any]], signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        rollups: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "anomalies": 0, "critical": 0})
        for signal in signals:
            ts = self._as_datetime(signal.get("timestamp"))
            bucket = ts.replace(second=0, microsecond=0).isoformat()
            rollups[bucket]["total"] += 1
            if signal.get("severity") != "normal":
                rollups[bucket]["anomalies"] += 1
            if signal.get("severity") == "critical":
                rollups[bucket]["critical"] += 1

        merged: dict[str, dict[str, Any]] = {}
        for row in existing:
            bucket = str(row.get("bucket") or "")
            if not bucket:
                continue
            merged[bucket] = {
                "bucket": bucket,
                "total": int(row.get("total") or 0),
                "anomalies": int(row.get("anomalies") or 0),
                "critical": int(row.get("critical") or 0),
            }

        for bucket, values in rollups.items():
            current = merged.get(bucket, {"bucket": bucket, "total": 0, "anomalies": 0, "critical": 0})
            current["total"] += values["total"]
            current["anomalies"] += values["anomalies"]
            current["critical"] += values["critical"]
            merged[bucket] = current

        ordered = sorted(merged.values(), key=lambda item: item["bucket"])
        return ordered[-720:]

    def _merge_recent_preview(self, existing: list[dict[str, Any]], signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        combined = list(existing)
        for signal in signals:
            combined.append(
                {
                    "id": signal.get("id"),
                    "dashboard_id": signal.get("dashboard_id"),
                    "timestamp": self._as_datetime(signal.get("timestamp")).isoformat(),
                    "service": signal.get("service"),
                    "level": signal.get("level"),
                    "message": str(signal.get("message") or "")[:220],
                    "anomaly_score": float(signal.get("anomaly_score") or 0.0),
                    "severity": signal.get("severity"),
                    "classification": signal.get("classification"),
                    "explanation": signal.get("explanation"),
                }
            )

        ordered = sorted(
            combined,
            key=lambda row: str(row.get("timestamp") or ""),
            reverse=True,
        )
        return ordered[:50]

    def _update_dashboard_metrics(self, dashboard_id: str, signals: list[dict[str, Any]]) -> dict[str, Any]:
        metrics = self._get_metrics_row(dashboard_id)

        total_existing = int(metrics.get("total_logs_processed") or 0)
        anomalies_existing = int(metrics.get("anomalies_detected") or 0)
        critical_existing = int(metrics.get("critical_alerts") or 0)

        ingested = len(signals)
        anomalies = sum(1 for signal in signals if signal.get("severity") != "normal")
        critical = sum(1 for signal in signals if signal.get("severity") == "critical")

        total_logs = total_existing + ingested
        anomalies_detected = anomalies_existing + anomalies
        critical_alerts = critical_existing + critical
        anomaly_rate = round((anomalies_detected / total_logs) * 100, 4) if total_logs else 0.0

        time_series_data = metrics.get("time_series_data") if isinstance(metrics.get("time_series_data"), list) else []
        preview_data = (
            metrics.get("last_50_logs_preview") if isinstance(metrics.get("last_50_logs_preview"), list) else []
        )

        merged_time_series = self._merge_time_series(time_series_data, signals)
        merged_preview = self._merge_recent_preview(preview_data, signals)
        now_iso = datetime.now(timezone.utc).isoformat()

        updated = (
            self.client.table(self.metrics_table)
            .update(
                {
                    "total_logs_processed": total_logs,
                    "anomalies_detected": anomalies_detected,
                    "critical_alerts": critical_alerts,
                    "anomaly_rate": anomaly_rate,
                    "time_series_data": merged_time_series,
                    "last_50_logs_preview": merged_preview,
                    "last_updated": now_iso,
                }
            )
            .eq("dashboard_id", dashboard_id)
            .execute()
        )

        if updated.data:
            return updated.data[0]

        return {
            "dashboard_id": dashboard_id,
            "total_logs_processed": total_logs,
            "anomalies_detected": anomalies_detected,
            "critical_alerts": critical_alerts,
            "anomaly_rate": anomaly_rate,
            "time_series_data": merged_time_series,
            "last_50_logs_preview": merged_preview,
            "last_updated": now_iso,
        }

    def ingest_many(self, user_id: str, email: Optional[str], payloads: list[LogIngestRequest]) -> LogSessionIngestResponse:
        if not payloads:
            raise ValueError("At least one log payload is required")

        self._ensure_user_exists(user_id, email)

        dashboard_ids = {payload.dashboard_id for payload in payloads}
        if len(dashboard_ids) != 1:
            raise ValueError("A single ingestion session must target exactly one dashboard_id")

        dashboard_id = next(iter(dashboard_ids))
        self._get_dashboard_or_raise(user_id, dashboard_id)

        signals = [self._signal_from_payload(payload) for payload in payloads]
        metrics = self._update_dashboard_metrics(dashboard_id, signals)

        anomalies_found = sum(1 for signal in signals if signal.get("severity") != "normal")
        critical_alerts = sum(1 for signal in signals if signal.get("severity") == "critical")

        created_session = (
            self.client.table(self.sessions_table)
            .insert(
                {
                    "dashboard_id": dashboard_id,
                    "logs_count": len(signals),
                    "anomalies_found": anomalies_found,
                    "critical_alerts": critical_alerts,
                }
            )
            .execute()
        )
        if not created_session.data:
            raise RuntimeError("Unable to create log session")

        session_row = created_session.data[0]
        session = LogSessionRecord(
            id=str(session_row.get("id")),
            dashboard_id=dashboard_id,
            logs_count=int(session_row.get("logs_count") or len(signals)),
            anomalies_found=int(session_row.get("anomalies_found") or anomalies_found),
            critical_alerts=int(session_row.get("critical_alerts") or critical_alerts),
            created_at=self._as_datetime(session_row.get("created_at")),
        )

        records = [self._record_from_signal(signal) for signal in signals]
        records.sort(key=lambda item: item.timestamp, reverse=True)

        del metrics
        return LogSessionIngestResponse(session=session, logs=records)

    def ingest_one(self, user_id: str, email: Optional[str], payload: LogIngestRequest) -> LogSessionIngestResponse:
        return self.ingest_many(user_id, email, [payload])

    @staticmethod
    def _within_range(ts: datetime, start_time: Optional[datetime], end_time: Optional[datetime]) -> bool:
        if start_time and ts < start_time:
            return False
        if end_time and ts > end_time:
            return False
        return True

    def _filtered_preview_records(
        self,
        dashboard_id: str,
        metrics_row: dict[str, Any],
        severity: Optional[str],
        service: Optional[str],
        start_time: Optional[datetime],
        end_time: Optional[datetime],
    ) -> list[LogRecord]:
        preview_data = (
            metrics_row.get("last_50_logs_preview") if isinstance(metrics_row.get("last_50_logs_preview"), list) else []
        )
        records = [self._record_from_preview(row) for row in preview_data]

        filtered: list[LogRecord] = []
        for record in records:
            if record.dashboard_id != dashboard_id:
                continue
            if severity and record.severity != severity:
                continue
            if service and record.service != service:
                continue
            if not self._within_range(record.timestamp, start_time, end_time):
                continue
            filtered.append(record)

        filtered.sort(key=lambda item: item.timestamp, reverse=True)
        return filtered

    def list_logs(
        self,
        user_id: str,
        dashboard_id: str,
        page: int = 1,
        page_size: int = 20,
        severity: Optional[str] = None,
        service: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> LogListResponse:
        self._get_dashboard_or_raise(user_id, dashboard_id)
        metrics = self._get_metrics_row(dashboard_id)

        all_records = self._filtered_preview_records(
            dashboard_id=dashboard_id,
            metrics_row=metrics,
            severity=severity,
            service=service,
            start_time=start_time,
            end_time=end_time,
        )
        total = len(all_records)

        start = (page - 1) * page_size
        end = start + page_size
        return LogListResponse(items=all_records[start:end], total=total, page=page, page_size=page_size)

    def get_dashboard_metrics(
        self,
        user_id: str,
        dashboard_id: str,
        severity: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> DashboardMetricsResponse:
        self._get_dashboard_or_raise(user_id, dashboard_id)
        metrics = self._get_metrics_row(dashboard_id)

        records = self._filtered_preview_records(
            dashboard_id=dashboard_id,
            metrics_row=metrics,
            severity=severity,
            service=None,
            start_time=start_time,
            end_time=end_time,
        )

        alerts = [record for record in records if record.severity != "normal"]

        trend_source = metrics.get("time_series_data") if isinstance(metrics.get("time_series_data"), list) else []
        trend: list[dict[str, Any]] = []
        for row in trend_source:
            bucket = self._as_datetime(row.get("bucket"))
            if not self._within_range(bucket, start_time, end_time):
                continue
            trend.append(
                {
                    "bucket": bucket.isoformat(),
                    "total": int(row.get("total") or 0),
                    "anomalies": int(row.get("anomalies") or 0),
                    "critical": int(row.get("critical") or 0),
                }
            )

        anomaly_rate = float(metrics.get("anomaly_rate") or 0.0)
        critical_alerts = int(metrics.get("critical_alerts") or 0)

        return DashboardMetricsResponse(
            dashboard_id=dashboard_id,
            total_logs_processed=int(metrics.get("total_logs_processed") or 0),
            anomalies_detected=int(metrics.get("anomalies_detected") or 0),
            critical_alerts=critical_alerts,
            anomaly_rate=round(anomaly_rate, 2),
            status=self._compute_status(anomaly_rate, critical_alerts),  # type: ignore[arg-type]
            last_updated=self._as_datetime(metrics.get("last_updated")),
            trend=trend,
            recent_logs=records[:50],
            alerts=alerts[:25],
        )

    def analytics_overview(self, user_id: str, dashboard_id: str, days: int = 14) -> AnalyticsOverview:
        self._get_dashboard_or_raise(user_id, dashboard_id)
        metrics = self._get_metrics_row(dashboard_id)

        since = datetime.now(timezone.utc) - timedelta(days=days)
        trend_source = metrics.get("time_series_data") if isinstance(metrics.get("time_series_data"), list) else []

        trend_rollup: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "critical": 0})
        for row in trend_source:
            bucket = self._as_datetime(row.get("bucket"))
            if bucket < since:
                continue
            day = bucket.date().isoformat()
            trend_rollup[day]["total"] += int(row.get("total") or 0)
            trend_rollup[day]["critical"] += int(row.get("critical") or 0)

        trend = [
            TrendPoint(day=day, total=values["total"], critical=values["critical"])
            for day, values in sorted(trend_rollup.items())
        ]

        preview_data = metrics.get("last_50_logs_preview") if isinstance(metrics.get("last_50_logs_preview"), list) else []
        service_map: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "critical": 0})
        for preview in preview_data:
            service = str(preview.get("service") or "unknown")
            service_map[service]["total"] += 1
            if preview.get("severity") == "critical":
                service_map[service]["critical"] += 1

        top_services = sorted(
            [
                ServiceBreakdown(service=name, total=values["total"], critical=values["critical"])
                for name, values in service_map.items()
            ],
            key=lambda row: row.total,
            reverse=True,
        )[:8]

        total_logs = int(metrics.get("total_logs_processed") or 0)
        total_anomalies = int(metrics.get("anomalies_detected") or 0)
        total_critical = int(metrics.get("critical_alerts") or 0)
        anomaly_rate = round(float(metrics.get("anomaly_rate") or 0.0), 2)

        return AnalyticsOverview(
            total_logs=total_logs,
            total_anomalies=total_anomalies,
            total_critical=total_critical,
            anomaly_rate=anomaly_rate,
            top_services=top_services,
            trend=trend,
        )

    def fetch_messages_for_training(
        self,
        user_id: Optional[str] = None,
        dashboard_id: Optional[str] = None,
        max_rows: int = 1500,
    ) -> list[str]:
        if user_id and dashboard_id:
            self._get_dashboard_or_raise(user_id, dashboard_id)
            metrics = self._get_metrics_row(dashboard_id)
            preview_data = (
                metrics.get("last_50_logs_preview") if isinstance(metrics.get("last_50_logs_preview"), list) else []
            )
            return [str(row.get("message") or "").strip() for row in preview_data if str(row.get("message") or "").strip()][:max_rows]

        configured_user_id = (self.settings.supabase_default_user_id or "").strip()
        if not configured_user_id:
            return []

        dashboards = (
            self.client.table(self.dashboards_table)
            .select("id")
            .eq("user_id", configured_user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not dashboards.data:
            return []

        metrics = self._get_metrics_row(str(dashboards.data[0].get("id")))
        preview_data = metrics.get("last_50_logs_preview") if isinstance(metrics.get("last_50_logs_preview"), list) else []
        messages = [str(row.get("message") or "").strip() for row in preview_data if str(row.get("message") or "").strip()]
        return messages[:max_rows]
