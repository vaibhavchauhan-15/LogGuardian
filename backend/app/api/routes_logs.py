from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from time import perf_counter
from typing import Optional

from dateutil import parser
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies import (
    get_anomaly_service,
    get_dashboard_service,
    get_request_user_context,
    get_realtime_hub,
    RequestUserContext,
)
from app.schemas.logs import (
    BatchIngestRequest,
    BatchIngestResponse,
    LogIngestRequest,
    LogIngestSummary,
    LogListResponse,
    UploadResponse,
)
from app.schemas.realtime import RealtimeEvent

router = APIRouter(tags=["logs"])


def _parse_optional_timestamp(value: Optional[str]):
    if not value:
        return datetime.now(timezone.utc)
    try:
        return parser.isoparse(value)
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def _parse_json_payload(content: str, dashboard_id: str) -> list[LogIngestRequest]:
    raw = json.loads(content)
    if isinstance(raw, dict) and isinstance(raw.get("logs"), list):
        raw = raw["logs"]
    elif isinstance(raw, dict):
        raw = [raw]

    if not isinstance(raw, list):
        raise HTTPException(status_code=400, detail="JSON payload must be an object or array")

    entries: list[LogIngestRequest] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        message = item.get("message") or item.get("log") or item.get("text")
        if not message:
            continue

        entries.append(
            LogIngestRequest(
                dashboard_id=str(item.get("dashboard_id") or dashboard_id),
                timestamp=_parse_optional_timestamp(item.get("timestamp") or item.get("time")),
                service=(item.get("service") or item.get("source") or "unknown"),
                level=(item.get("level") or item.get("severity") or "INFO"),
                message=str(message),
            )
        )

    return entries


def _parse_csv_payload(content: str, dashboard_id: str) -> list[LogIngestRequest]:
    reader = csv.DictReader(io.StringIO(content))
    entries: list[LogIngestRequest] = []
    for row in reader:
        message = row.get("message") or row.get("log") or row.get("text")
        if not message:
            continue

        entries.append(
            LogIngestRequest(
                dashboard_id=str(row.get("dashboard_id") or dashboard_id),
                timestamp=_parse_optional_timestamp(row.get("timestamp") or row.get("time") or row.get("date")),
                service=(row.get("service") or row.get("source") or "unknown"),
                level=(row.get("level") or row.get("severity") or "INFO"),
                message=message,
            )
        )

    return entries


def _parse_txt_payload(content: str, dashboard_id: str) -> list[LogIngestRequest]:
    entries: list[LogIngestRequest] = []
    for line in content.splitlines():
        message = line.strip()
        if not message:
            continue
        entries.append(
            LogIngestRequest(
                dashboard_id=dashboard_id,
                timestamp=datetime.now(timezone.utc),
                message=message,
                service="unknown",
                level="INFO",
            )
        )
    return entries


@router.post("/logs/ingest", response_model=LogIngestSummary)
async def ingest_log(
    payload: LogIngestRequest,
    user: RequestUserContext = Depends(get_request_user_context),
) -> LogIngestSummary:
    dashboard_service = get_dashboard_service()
    realtime_hub = get_realtime_hub()

    try:
        session_response = await run_in_threadpool(
            dashboard_service.ingest_one,
            user.user_id,
            user.email,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    record = session_response.logs[0]
    is_alert = record.severity == "critical"

    await realtime_hub.broadcast(
        RealtimeEvent(
            event="log_ingested",
            payload={
                "dashboard_id": payload.dashboard_id,
                "log": record.model_dump(mode="json"),
            },
        )
    )

    if is_alert:
        await realtime_hub.broadcast(
            RealtimeEvent(
                event="alert_created",
                payload={
                    "dashboard_id": payload.dashboard_id,
                    "alert": record.model_dump(mode="json"),
                },
            )
        )

    return LogIngestSummary(log=record, alert_triggered=is_alert)


@router.post("/logs/ingest/batch", response_model=BatchIngestResponse)
async def ingest_batch(
    payload: BatchIngestRequest,
    user: RequestUserContext = Depends(get_request_user_context),
) -> BatchIngestResponse:
    start = perf_counter()
    dashboard_service = get_dashboard_service()
    realtime_hub = get_realtime_hub()

    try:
        session_response = await run_in_threadpool(
            dashboard_service.ingest_many,
            user.user_id,
            user.email,
            payload.logs,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ingested = len(session_response.logs)
    elapsed_ms = int((perf_counter() - start) * 1000)
    dashboard_id = payload.logs[0].dashboard_id

    await realtime_hub.broadcast(
        RealtimeEvent(
            event="log_ingested",
            payload={
                "dashboard_id": dashboard_id,
                "batch": {
                    "ingested": ingested,
                    "processing_ms": elapsed_ms,
                    "session_id": session_response.session.id,
                },
            },
        )
    )

    return BatchIngestResponse(ingested=ingested, skipped=max(0, len(payload.logs) - ingested), processing_ms=elapsed_ms)


@router.post("/logs/upload", response_model=UploadResponse)
async def upload_logs(
    dashboard_id: str = Query(..., min_length=1, description="Dashboard ID for this upload session"),
    file: UploadFile = File(...),
    train_model: bool = Query(default=True, description="Retrain model after upload"),
    user: RequestUserContext = Depends(get_request_user_context),
) -> UploadResponse:
    file_name = file.filename or "logs.txt"
    suffix = file_name.lower().split(".")[-1]
    content = (await file.read()).decode("utf-8", errors="replace")

    try:
        if suffix == "json":
            entries = _parse_json_payload(content, dashboard_id)
        elif suffix == "csv":
            entries = _parse_csv_payload(content, dashboard_id)
        else:
            entries = _parse_txt_payload(content, dashboard_id)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON file") from exc

    if not entries:
        raise HTTPException(status_code=400, detail="No valid logs found in uploaded file")

    dashboard_service = get_dashboard_service()
    try:
        session_response = await run_in_threadpool(
            dashboard_service.ingest_many,
            user.user_id,
            user.email,
            entries,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    ingested = len(session_response.logs)

    trained = False
    if train_model:
        anomaly_service = get_anomaly_service()
        messages = await run_in_threadpool(
            dashboard_service.fetch_messages_for_training,
            user.user_id,
            dashboard_id,
        )
        summary = await run_in_threadpool(anomaly_service.train, messages)
        trained = summary.trained

    return UploadResponse(ingested=ingested, skipped=max(0, len(entries) - ingested), trained=trained)


@router.get("/logs", response_model=LogListResponse)
async def get_logs(
    dashboard_id: str = Query(..., min_length=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    level: Optional[str] = None,
    service: Optional[str] = None,
    severity: Optional[str] = Query(default=None, pattern="^(normal|suspicious|critical)$"),
    classification: Optional[str] = Query(default=None, pattern="^(normal|suspicious|critical)$"),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    user: RequestUserContext = Depends(get_request_user_context),
) -> LogListResponse:
    dashboard_service = get_dashboard_service()

    effective_severity = severity or classification
    if level and not effective_severity:
        normalized = level.strip().upper()
        if normalized in {"DEBUG", "INFO"}:
            effective_severity = "normal"
        elif normalized == "WARN":
            effective_severity = "suspicious"
        elif normalized in {"ERROR", "CRITICAL"}:
            effective_severity = "critical"

    try:
        return await run_in_threadpool(
            dashboard_service.list_logs,
            user.user_id,
            dashboard_id,
            page,
            page_size,
            effective_severity,
            service,
            start_time,
            end_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
