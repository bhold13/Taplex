from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TapLex API"
    app_env: str = Field(default="development", alias="APP_ENV")
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"], alias="ALLOWED_ORIGINS"
    )
    allow_dev_auth: bool = Field(default=True, alias="ALLOW_DEV_AUTH")
    firebase_project_id: str | None = Field(default=None, alias="FIREBASE_PROJECT_ID")
    firebase_credentials_path: str | None = Field(default=None, alias="FIREBASE_CREDENTIALS_PATH")
    firebase_storage_bucket: str | None = Field(default=None, alias="FIREBASE_STORAGE_BUCKET")
    stripe_secret_key: str | None = Field(default=None, alias="STRIPE_SECRET_KEY")
    stripe_price_monthly: str | None = Field(default=None, alias="STRIPE_PRICE_MONTHLY")
    stripe_price_annual: str | None = Field(default=None, alias="STRIPE_PRICE_ANNUAL")
    stripe_price_lifetime: str | None = Field(default=None, alias="STRIPE_PRICE_LIFETIME")
    public_frontend_url: str = Field(default="http://localhost:3000", alias="PUBLIC_FRONTEND_URL")
    rate_limit_per_minute: int = Field(default=120, alias="RATE_LIMIT_PER_MINUTE")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
