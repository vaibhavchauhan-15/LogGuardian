from fastapi import APIRouter

from app.api.routes_alerts import router as alerts_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_dashboards import router as dashboards_router
from app.api.routes_health import router as health_router
from app.api.routes_logs import router as logs_router
from app.api.routes_model import router as model_router
from app.api.routes_stream import router as stream_router

router = APIRouter()
router.include_router(health_router)
router.include_router(dashboards_router)
router.include_router(logs_router)
router.include_router(analytics_router)
router.include_router(model_router)
router.include_router(alerts_router)
router.include_router(stream_router)
