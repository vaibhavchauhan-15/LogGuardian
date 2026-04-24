from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "LogGuardian API"
    app_version: str = "1.0.0"
    environment: str = "development"
    api_prefix: str = "/api/v1"

    frontend_origin: str = Field(default="http://localhost:3000", alias="FRONTEND_ORIGIN")

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_key: str = Field(default="", alias="SUPABASE_KEY")
    supabase_role_key: str = Field(default="", alias="SUPABASE_ROLE_KEY")
    supabase_anon_public_key: str = Field(default="", alias="SUPABASE_ANON_PUBLIC_KEY")
    supabase_alerts_table: str = Field(default="alerts", alias="SUPABASE_ALERTS_TABLE")
    supabase_anomalies_table: str = Field(default="anomalies", alias="SUPABASE_ANOMALIES_TABLE")
    supabase_analytics_minute_table: str = Field(default="analytics_minute", alias="SUPABASE_ANALYTICS_MINUTE_TABLE")
    supabase_default_user_id: str = Field(default="", alias="SUPABASE_DEFAULT_USER_ID")
    supabase_default_project_id: str = Field(default="", alias="SUPABASE_DEFAULT_PROJECT_ID")
    supabase_bootstrap_user_email: str = Field(
        default="logguardian-bootstrap@local",
        alias="SUPABASE_BOOTSTRAP_USER_EMAIL",
    )

    redis_url: str = Field(default="", alias="REDIS_URL")

    suspicious_threshold: float = Field(default=0.4, alias="SUSPICIOUS_THRESHOLD")
    critical_threshold: float = Field(default=0.7, alias="CRITICAL_THRESHOLD")
    alert_dedupe_window_seconds: int = Field(default=300, alias="ALERT_DEDUPE_WINDOW_SECONDS")
    realtime_buffer_size: int = Field(default=150, alias="REALTIME_BUFFER_SIZE")

    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    alert_email_from: str = Field(default="", alias="ALERT_EMAIL_FROM")
    alert_email_to: str = Field(default="", alias="ALERT_EMAIL_TO")

    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str = Field(default="", alias="TELEGRAM_CHAT_ID")

    sentence_transformer_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        alias="SENTENCE_TRANSFORMER_MODEL",
    )
    enable_semantic_embeddings: bool = Field(default=True, alias="ENABLE_SEMANTIC_EMBEDDINGS")

    model_store_path: str = Field(
        default=str(BACKEND_ROOT / "models" / "isolation_forest.joblib"),
        alias="MODEL_STORE_PATH",
    )

    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_ROOT / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> List[str]:
        origins = [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]
        return origins or ["http://localhost:3000"]

    @property
    def supabase_api_key_candidates(self) -> List[tuple[str, str]]:
        candidates = [
            ("SUPABASE_ROLE_KEY", self.supabase_role_key),
            ("SUPABASE_KEY", self.supabase_key),
            ("SUPABASE_ANON_PUBLIC_KEY", self.supabase_anon_public_key),
        ]
        return [(name, key.strip()) for name, key in candidates if key and key.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
