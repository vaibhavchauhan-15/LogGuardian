"""Best-effort structured parsing of raw log lines.

Ingestion accepts free-form text. This module extracts the fields that drive
analytics and detection — timestamp, level, service, HTTP status, client IP —
so the dashboards and charts reflect the *real* log content instead of treating
every line as an undated "unknown/INFO" event.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from dateutil import parser as date_parser


@dataclass
class ParsedLog:
    timestamp: Optional[datetime] = None
    level: Optional[str] = None
    service: Optional[str] = None
    http_status: Optional[int] = None
    http_method: Optional[str] = None
    path: Optional[str] = None
    client_ip: Optional[str] = None


# Leading ISO-8601 timestamp (with optional fractional seconds / timezone).
_ISO_TS_RE = re.compile(
    r"^\s*(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)"
)
# Common syslog-ish "Jun 24 10:00:12" prefix as a fallback.
_SYSLOG_TS_RE = re.compile(r"^\s*([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})")

_LEVEL_TOKENS = {
    "DEBUG": "DEBUG",
    "TRACE": "DEBUG",
    "INFO": "INFO",
    "NOTICE": "INFO",
    "WARN": "WARN",
    "WARNING": "WARN",
    "ERROR": "ERROR",
    "ERR": "ERROR",
    "CRITICAL": "CRITICAL",
    "CRIT": "CRITICAL",
    "FATAL": "CRITICAL",
    "ALERT": "CRITICAL",
    "EMERGENCY": "CRITICAL",
}
_LEVEL_RE = re.compile(
    r"\b(" + "|".join(sorted(_LEVEL_TOKENS, key=len, reverse=True)) + r")\b"
)

_HTTP_RE = re.compile(
    r"\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b\s+(\S+)(?:\s+(\d{3})\b)?",
    re.IGNORECASE,
)
_STATUS_RE = re.compile(r"\b([1-5]\d{2})\b")
_IP_RE = re.compile(r"\b(\d{1,3}(?:\.\d{1,3}){3})\b")
_KV_SERVICE_RE = re.compile(r"\b(?:service|source|component|app)\s*[=:]\s*([A-Za-z0-9._-]+)", re.IGNORECASE)

# Phrases that strongly imply a security/anomaly context (used for service tagging).
_SECURITY_HINTS = (
    "alert",
    "injection",
    "impossible travel",
    "brute force",
    "traffic spike",
    "unauthorized",
    "intrusion",
    "exfiltration",
    "malware",
    "fraud",
)


def _parse_timestamp(raw: str) -> Optional[datetime]:
    match = _ISO_TS_RE.match(raw) or _SYSLOG_TS_RE.match(raw)
    if not match:
        return None
    try:
        return date_parser.parse(match.group(1))
    except (ValueError, OverflowError, TypeError):
        return None


def _parse_level(raw: str) -> Optional[str]:
    match = _LEVEL_RE.search(raw)
    if not match:
        return None
    return _LEVEL_TOKENS.get(match.group(1).upper())


def _service_from_path(path: str) -> str:
    # Strip query string and leading slash, take the first segment.
    clean = path.split("?", 1)[0].strip("/")
    first = clean.split("/", 1)[0].lower() if clean else ""
    mapping = {
        "login": "auth",
        "signin": "auth",
        "logout": "auth",
        "oauth": "auth",
        "admin": "admin",
        "api": "api",
    }
    if first in mapping:
        return mapping[first]
    return first or "web"


def _parse_service(raw: str, lower: str, path: Optional[str]) -> Optional[str]:
    kv = _KV_SERVICE_RE.search(raw)
    if kv:
        return kv.group(1).lower()
    if any(hint in lower for hint in _SECURITY_HINTS):
        return "security"
    if path:
        return _service_from_path(path)
    if "login" in lower or "auth" in lower:
        return "auth"
    return None


def parse_log_line(raw: str) -> ParsedLog:
    """Extract structured fields from a single raw log line (best-effort)."""
    if not raw or not raw.strip():
        return ParsedLog()

    text = raw.strip()
    lower = text.lower()

    timestamp = _parse_timestamp(text)
    level = _parse_level(text)

    http_method: Optional[str] = None
    path: Optional[str] = None
    http_status: Optional[int] = None

    http_match = _HTTP_RE.search(text)
    if http_match:
        http_method = http_match.group(1).upper()
        path = http_match.group(2)
        if http_match.group(3):
            http_status = int(http_match.group(3))

    if http_status is None:
        # Fall back to any standalone 3-digit HTTP-looking status, but only when
        # a method/path is present so we don't misread arbitrary numbers.
        if http_method:
            status_match = _STATUS_RE.search(text[http_match.end():]) if http_match else None
            if status_match:
                http_status = int(status_match.group(1))

    ip_match = _IP_RE.search(text)
    client_ip = ip_match.group(1) if ip_match else None

    service = _parse_service(text, lower, path)

    return ParsedLog(
        timestamp=timestamp,
        level=level,
        service=service,
        http_status=http_status,
        http_method=http_method,
        path=path,
        client_ip=client_ip,
    )
