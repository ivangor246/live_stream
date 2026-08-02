from collections import defaultdict
from dataclasses import dataclass
from threading import Lock


@dataclass
class HttpMetric:
    count: int = 0
    duration_seconds: float = 0


class HttpMetrics:
    def __init__(self) -> None:
        self._lock = Lock()
        self._metrics: defaultdict[tuple[str, str, int], HttpMetric] = defaultdict(
            HttpMetric,
        )

    def record(
        self,
        method: str,
        route: str,
        status_code: int,
        duration_seconds: float,
    ) -> None:
        with self._lock:
            metric = self._metrics[(method, route, status_code)]
            metric.count += 1
            metric.duration_seconds += duration_seconds

    def render(self) -> str:
        with self._lock:
            metrics = list(self._metrics.items())

        lines = [
            "# HELP live_stream_http_requests_total Total completed HTTP requests.",
            "# TYPE live_stream_http_requests_total counter",
            "# HELP live_stream_http_request_duration_seconds HTTP request duration.",
            "# TYPE live_stream_http_request_duration_seconds summary",
        ]

        for (method, route, status_code), metric in sorted(metrics):
            labels = (
                f'method="{_escape_label(method)}",'
                f'route="{_escape_label(route)}",'
                f'status="{status_code}"'
            )
            lines.append(f"live_stream_http_requests_total{{{labels}}} {metric.count}")
            lines.append(
                "live_stream_http_request_duration_seconds_sum"
                f"{{{labels}}} {metric.duration_seconds:.6f}",
            )
            lines.append(
                "live_stream_http_request_duration_seconds_count"
                f"{{{labels}}} {metric.count}",
            )

        return "\n".join(lines) + "\n"


def _escape_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')


http_metrics = HttpMetrics()
