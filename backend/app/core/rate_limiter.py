"""In-memory sliding window Rate Limiting Middleware for API endpoint protection."""
from __future__ import annotations

import time
import logging
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter enforcing a maximum number of requests per client IP within a window.
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Exempt health check endpoints
        if request.url.path.startswith("/api/v1/health"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean timestamps older than window
        timestamps = [t for t in self._requests[client_ip] if t > cutoff]
        self._requests[client_ip] = timestamps

        if len(timestamps) >= self.max_requests:
            logger.warning("Rate limit exceeded for client IP: %s", client_ip)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"API rate limit exceeded ({self.max_requests} requests/{self.window_seconds}s). Please try again later.",
            )

        self._requests[client_ip].append(now)
        response = await call_next(request)
        return response
