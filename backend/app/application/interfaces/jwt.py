from abc import ABC, abstractmethod


class JWTService(ABC):
    @abstractmethod
    def create_access_token(self, data: dict) -> str:
        ...

    @abstractmethod
    def decode_token(self, token: str) -> dict:
        ...
