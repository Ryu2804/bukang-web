from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class User:
    id: str
    username: str
    hashed_password: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def create(username: str, hashed_password: str, user_id: str) -> "User":
        return User(
            id=user_id,
            username=username,
            hashed_password=hashed_password,
        )
