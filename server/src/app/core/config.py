from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Live Stream Monitor API"
    app_version: str = "1.0.0"
    cors_origins: str = "*"
    database_url: str = "postgresql+asyncpg://live_stream:live_stream@localhost:5432/live_stream"
    database_echo: bool = False
    media_rtmp_url: str = "rtmp://localhost:1935"
    media_hls_url: str = "http://localhost:8888"
    media_webrtc_url: str = "http://localhost:8889"
    media_playback_api_url: str = "http://localhost:9996"
    media_api_url: str = "http://localhost:9997"
    media_api_timeout: float = 2.0
    media_auth_secret: str = "local-development-media-secret"
    media_auth_token_ttl_seconds: int = 3600
    auth_cookie_name: str = "live_stream_session"
    auth_session_ttl_days: int = 14
    auth_invite_ttl_hours: int = 168
    stream_invite_ttl_hours: int = 168
    auth_secure_cookie: bool = False
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
        env_file=".env",
    )

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return origins or ["*"]


settings = Settings()
