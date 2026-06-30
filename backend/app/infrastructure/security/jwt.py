from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings
from app.application.interfaces.jwt import JWTService


class JoseJWTService(JWTService):
    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        to_encode.update({"exp": expire})
        return jwt.encode(
            to_encode, settings.secret_key, algorithm=settings.algorithm
        )

    def decode_token(self, token: str) -> dict:
        try:
            return jwt.decode(
                token, settings.secret_key, algorithms=[settings.algorithm]
            )
        except JWTError:
            raise ValueError("Invalid token")
