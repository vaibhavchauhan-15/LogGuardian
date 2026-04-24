from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies import get_dashboard_service, get_request_user_context, RequestUserContext
from app.schemas.analytics import AnalyticsOverview

router = APIRouter(tags=["analytics"])


@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    dashboard_id: str = Query(..., min_length=1),
    days: int = Query(default=14, ge=1, le=90),
    user: RequestUserContext = Depends(get_request_user_context),
) -> AnalyticsOverview:
    dashboard_service = get_dashboard_service()
    try:
        return await run_in_threadpool(dashboard_service.analytics_overview, user.user_id, dashboard_id, days)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
