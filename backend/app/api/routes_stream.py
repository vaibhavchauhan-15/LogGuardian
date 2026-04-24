from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.dependencies import get_realtime_hub
from app.schemas.realtime import RealtimeEvent

router = APIRouter(tags=["realtime"])


@router.get("/stream/status")
def stream_status() -> dict:
    hub = get_realtime_hub()
    return {"clients": hub.client_count}


@router.websocket("/stream/logs")
async def stream_logs(websocket: WebSocket) -> None:
    hub = get_realtime_hub()
    await hub.connect(websocket)

    await websocket.send_json(
        RealtimeEvent(
            event="connected",
            timestamp=datetime.now(timezone.utc),
            payload={"clients": hub.client_count},
        ).model_dump(mode="json")
    )
    await hub.replay_recent(websocket)

    try:
        while True:
            incoming = await websocket.receive_text()
            if incoming.strip().lower() == "ping":
                await websocket.send_json(
                    RealtimeEvent(
                        event="heartbeat",
                        timestamp=datetime.now(timezone.utc),
                        payload={"clients": hub.client_count},
                    ).model_dump(mode="json")
                )
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
