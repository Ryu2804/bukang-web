from dataclasses import dataclass

from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.application.interfaces.jwt import JWTService
from app.application.interfaces.password import PasswordService


@dataclass
class RegisterRequest:
    username: str
    password: str


@dataclass
class LoginRequest:
    username: str
    password: str


@dataclass
class TokenResult:
    access_token: str
    token_type: str = "bearer"


@dataclass
class UserResult:
    id: str
    username: str


class AuthUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        password_service: PasswordService,
        jwt_service: JWTService,
    ):
        self._user_repo = user_repository
        self._password = password_service
        self._jwt = jwt_service

    def register(self, request: RegisterRequest) -> UserResult:
        existing = self._user_repo.find_by_username(request.username)
        if existing is not None:
            raise ValueError("Username already taken")

        import uuid
        user_id = str(uuid.uuid4())
        hashed = self._password.hash(request.password)
        user = User.create(
            username=request.username,
            hashed_password=hashed,
            user_id=user_id,
        )
        self._user_repo.save(user)
        return UserResult(id=user.id, username=user.username)

    def login(self, request: LoginRequest) -> TokenResult:
        user = self._user_repo.find_by_username(request.username)
        if user is None:
            raise ValueError("Invalid username or password")

        if not self._password.verify(request.password, user.hashed_password):
            raise ValueError("Invalid username or password")

        token = self._jwt.create_access_token({"sub": user.id})
        return TokenResult(access_token=token)

    def verify_token(self, token: str) -> User:
        payload = self._jwt.decode_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise ValueError("Invalid token")

        user = self._user_repo.find_by_id(user_id)
        if user is None:
            raise ValueError("Invalid token")

        return user
