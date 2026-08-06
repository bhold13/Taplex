from collections import defaultdict, deque
from collections.abc import Callable
from time import monotonic

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    """Small per-process limiter for abuse resistance before managed edge limits."""

    def __init__(self, app, requests_per_minute: int | None = None):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute or get_settings().rate_limit_per_minute
        self.window_seconds = 60
        self.events: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path.endswith("/health"):
            return await call_next(request)

        client_host = request.client.host if request.client else "unknown"
        now = monotonic()
        bucket = self.events[client_host]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.requests_per_minute:
            return Response("Rate limit exceeded.", status_code=429)
        bucket.append(now)
        return await call_next(request)
