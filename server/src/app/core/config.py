from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Live Stream Monitor API"
    app_version: str = "1.0.0"
    cors_origins: str = "*"
    database_url: str = "postgresql+asyncpg://live_stream:live_stream@localhost:5432/live_stream"
    database_echo: bool = False
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return origins or ["*"]


settings = Settings()
