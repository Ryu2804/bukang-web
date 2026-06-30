from abc import ABC, abstractmethod

from app.domain.entities.user import User


class UserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: str) -> User | None:
        ...

    @abstractmethod
    def find_by_username(self, username: str) -> User | None:
        ...

    @abstractmethod
    def save(self, user: User) -> User:
        ...
