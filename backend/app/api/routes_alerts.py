import hashlib
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies import RequestUserContext, get_dashboard_service, get_request_user_context
from app.schemas.alerts import AlertListResponse, AlertRecord, AlertResolveRequest, AlertResolveResponse

router = APIRouter(tags=["alerts"])


def _priority_from_severity(severity: str) -> str:
    if severity == "critical":
        return "critical"
    if severity == "suspicious":
        return "high"
    return "low"


def _alert_id(dashboard_id: str, service: str, message: str, timestamp: str) -> str:
    base = f"{dashboard_id}|{service}|{message}|{timestamp}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:32]


@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    dashboard_id: str = Query(..., min_length=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None, pattern="^(pending|active|resolved)$"),
    priority: Optional[str] = Query(default=None, pattern="^(low|medium|high|critical)$"),
    service: Optional[str] = None,
    user: RequestUserContext = Depends(get_request_user_context),
) -> AlertListResponse:
    dashboard_service = get_dashboard_service()
    try:
        metrics = await run_in_threadpool(
            dashboard_service.get_dashboard_metrics,
            user.user_id,
            dashboard_id,
            None,
            None,
            None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    items: list[AlertRecord] = []
    for record in metrics.alerts:
        mapped_priority = _priority_from_severity(record.severity)
        if priority and mapped_priority != priority:
            continue
        if service and record.service != service:
            continue
        if status and status not in {"pending", "active"}:
            continue

        created_at = record.created_at or record.timestamp
        alert_id = _alert_id(dashboard_id, record.service, record.message, created_at.isoformat())
        items.append(
            AlertRecord(
                id=alert_id,
                created_at=created_at,
                updated_at=created_at,
                service=record.service,
                classification=record.severity,
                priority=mapped_priority,  # type: ignore[arg-type]
                status="pending",
                title=f"{record.severity.title()} event in {record.service}",
                message=record.message,
                dedupe_key=alert_id,
                group_key=f"{dashboard_id}:{record.service}:{record.severity}",
                occurrence_count=1,
                last_seen_at=created_at,
            )
        )

    items.sort(key=lambda item: item.created_at, reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return AlertListResponse(items=items[start:end], total=total, page=page, page_size=page_size)


@router.post("/alerts/{alert_id}/resolve", response_model=AlertResolveResponse)
async def resolve_alert(
    alert_id: str,
    payload: AlertResolveRequest,
    dashboard_id: str = Query(..., min_length=1),
    user: RequestUserContext = Depends(get_request_user_context),
) -> AlertResolveResponse:
    del payload

    dashboard_service = get_dashboard_service()
    try:
        metrics = await run_in_threadpool(
            dashboard_service.get_dashboard_metrics,
            user.user_id,
            dashboard_id,
            None,
            None,
            None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    for record in metrics.alerts:
        created_at = record.created_at or record.timestamp
        candidate_id = _alert_id(dashboard_id, record.service, record.message, created_at.isoformat())
        if candidate_id != alert_id:
            continue
        alert = AlertRecord(
            id=candidate_id,
            created_at=created_at,
            updated_at=created_at,
            service=record.service,
            classification=record.severity,
            priority=_priority_from_severity(record.severity),  # type: ignore[arg-type]
            status="resolved",
            title=f"{record.severity.title()} event in {record.service}",
            message=record.message,
            dedupe_key=candidate_id,
            group_key=f"{dashboard_id}:{record.service}:{record.severity}",
            occurrence_count=1,
            last_seen_at=created_at,
        )
        return AlertResolveResponse(success=True, alert=alert)

    if not metrics.alerts:
        raise HTTPException(status_code=404, detail="Alert not found")
    raise HTTPException(status_code=404, detail="Alert not found")
