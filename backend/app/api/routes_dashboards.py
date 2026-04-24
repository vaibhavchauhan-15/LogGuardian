from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies import (
    RequestUserContext,
    get_dashboard_service,
    get_request_user_context,
)
from app.schemas.dashboards import (
    DashboardCreateRequest,
    DashboardListResponse,
    DashboardMetricsResponse,
    DashboardSummary,
)

router = APIRouter(tags=["dashboards"])


@router.post("/dashboards", response_model=DashboardSummary)
async def create_dashboard(
    payload: DashboardCreateRequest,
    user: RequestUserContext = Depends(get_request_user_context),
) -> DashboardSummary:
    dashboard_service = get_dashboard_service()
    return await run_in_threadpool(dashboard_service.create_dashboard, user.user_id, user.email, payload)


@router.get("/dashboards", response_model=DashboardListResponse)
async def list_dashboards(
    user: RequestUserContext = Depends(get_request_user_context),
) -> DashboardListResponse:
    dashboard_service = get_dashboard_service()
    return await run_in_threadpool(dashboard_service.list_dashboards, user.user_id, user.email)


@router.get("/dashboards/{dashboard_id}/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    dashboard_id: str,
    severity: Optional[str] = Query(default=None, pattern="^(normal|suspicious|critical)$"),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    user: RequestUserContext = Depends(get_request_user_context),
) -> DashboardMetricsResponse:
    dashboard_service = get_dashboard_service()
    try:
        return await run_in_threadpool(
            dashboard_service.get_dashboard_metrics,
            user.user_id,
            dashboard_id,
            severity,
            start_time,
            end_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
