from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Bukang API"
    debug: bool = False
    database_url: str = "sqlite:///./bukang.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "*"
    hf_storage_repo: str = ""
    hf_token: str = ""
    model_config = {"env_file": "../.env"}


settings = Settings()
