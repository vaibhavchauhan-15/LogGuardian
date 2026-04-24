from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies import (
    RequestUserContext,
    get_anomaly_service,
    get_dashboard_service,
    get_request_user_context,
)
from app.schemas.logs import ModelStatusResponse, ModelTrainResponse

router = APIRouter(tags=["model"])


@router.post("/model/train", response_model=ModelTrainResponse)
async def train_model(
    dashboard_id: str = Query(..., min_length=1),
    user: RequestUserContext = Depends(get_request_user_context),
) -> ModelTrainResponse:
    dashboard_service = get_dashboard_service()
    anomaly_service = get_anomaly_service()

    try:
        messages = await run_in_threadpool(
            dashboard_service.fetch_messages_for_training,
            user.user_id,
            dashboard_id,
            4000,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    summary = await run_in_threadpool(anomaly_service.train, messages)
    return ModelTrainResponse(
        trained=summary.trained,
        samples_used=summary.samples_used,
        message=summary.message,
    )


@router.get("/model/status", response_model=ModelStatusResponse)
async def model_status() -> ModelStatusResponse:
    anomaly_service = get_anomaly_service()
    return ModelStatusResponse(
        trained=anomaly_service.is_trained,
        model_path=str(anomaly_service.model_path),
        trained_at=anomaly_service.trained_at,
    )
