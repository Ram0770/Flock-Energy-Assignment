from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Urja Meter Wrapper API"
    DEBUG: bool = False
    
    # Legacy Portal URL & credentials
    PORTAL_URL: str = Field(default="http://localhost:8001", validation_alias="PORTAL_URL")
    PORTAL_USERNAME: str = Field(default="admin", validation_alias="PORTAL_USERNAME")
    PORTAL_PASSWORD: str = Field(default="password123", validation_alias="PORTAL_PASSWORD")
    
    # HTTP Scraper Config
    TIMEOUT_SECONDS: float = Field(default=10.0, validation_alias="TIMEOUT_SECONDS")
    RETRY_ATTEMPTS: int = Field(default=3, validation_alias="RETRY_ATTEMPTS")
    
    # Redis Cache Settings
    REDIS_URL: Optional[str] = Field(default="redis://localhost:6379", validation_alias="REDIS_URL")
    CACHE_EXPIRY_SECONDS: int = Field(default=300, validation_alias="CACHE_EXPIRY_SECONDS")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
