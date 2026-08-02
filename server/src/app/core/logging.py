import json
import logging
import time
from contextvars import ContextVar, Token
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint

request_id_context: ContextVar[str | None] = ContextVar(
    "request_id",
    default=None,
)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_context.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "requestId": getattr(record, "request_id", None),
        }

        for attribute, key in (
            ("event", "event"),
            ("http_method", "httpMethod"),
            ("http_route", "httpRoute"),
            ("http_status", "httpStatus"),
            ("duration_ms", "durationMs"),
        ):
            value = getattr(record, attribute, None)
            if value is not None:
                payload[key] = value

        if record.exc_info:
            payload["exceptionType"] = record.exc_info[0].__name__

        return json.dumps(payload, ensure_ascii=False)


def configure_logging(log_level: str) -> None:
    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(JsonFormatter())
    level = getattr(logging, log_level.upper(), logging.INFO)

    logging.basicConfig(level=level, handlers=[handler], force=True)

    for logger_name in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.setLevel(level)
        logger.propagate = True

    access_logger = logging.getLogger("uvicorn.access")
    access_logger.handlers.clear()
    access_logger.disabled = True
    access_logger.propagate = False


def create_request_id(value: str | None) -> str:
    if value:
        try:
            return str(UUID(value))
        except ValueError:
            pass

    return str(uuid4())


async def log_http_request(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    request_id = create_request_id(request.headers.get("X-Request-ID"))
    context_token: Token[str | None] = request_id_context.set(request_id)
    started_at = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        route = request.scope.get("route")
        logging.getLogger("app.http").info(
            "HTTP request completed",
            extra={
                "event": "http_request_completed",
                "http_method": request.method,
                "http_route": getattr(route, "path", "unmatched"),
                "http_status": status_code,
                "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
            },
        )
        request_id_context.reset(context_token)
