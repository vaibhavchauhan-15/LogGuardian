from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timezone
from typing import Iterable

from fastapi import WebSocket

from app.schemas.realtime import RealtimeEvent


class RealtimeHub:
    def __init__(self, buffer_size: int = 150) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._recent_events: deque[RealtimeEvent] = deque(maxlen=max(10, buffer_size))

    async def connect(self, socket: WebSocket) -> None:
        await socket.accept()
        async with self._lock:
            self._clients.add(socket)

    async def disconnect(self, socket: WebSocket) -> None:
        async with self._lock:
            if socket in self._clients:
                self._clients.remove(socket)

    async def replay_recent(self, socket: WebSocket) -> None:
        for event in self._recent_events:
            await socket.send_json(event.model_dump(mode="json"))

    async def broadcast(self, event: RealtimeEvent) -> None:
        self._recent_events.append(event)

        async with self._lock:
            recipients: Iterable[WebSocket] = tuple(self._clients)

        stale: list[WebSocket] = []
        for socket in recipients:
            try:
                await socket.send_json(event.model_dump(mode="json"))
            except Exception:
                stale.append(socket)

        if stale:
            async with self._lock:
                for socket in stale:
                    self._clients.discard(socket)

    async def heartbeat(self) -> None:
        await self.broadcast(
            RealtimeEvent(
                event="heartbeat",
                timestamp=datetime.now(timezone.utc),
                payload={"clients": len(self._clients)},
            )
        )

    @property
    def client_count(self) -> int:
        return len(self._clients)
