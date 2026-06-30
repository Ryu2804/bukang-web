from abc import ABC, abstractmethod


class PasswordService(ABC):
    @abstractmethod
    def hash(self, password: str) -> str:
        ...

    @abstractmethod
    def verify(self, plain: str, hashed: str) -> bool:
        ...
