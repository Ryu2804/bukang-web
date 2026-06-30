from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.persistence.repositories.user_repository import (
    SQLAlchemyUserRepository,
)
from app.infrastructure.security.jwt import JoseJWTService
from app.application.use_cases.auth_use_case import AuthUseCase

oauth2_scheme = HTTPBearer(auto_error=False)


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return SQLAlchemyUserRepository(db)


def get_auth_use_case(
    user_repo: UserRepository = Depends(get_user_repository),
) -> AuthUseCase:
    from app.infrastructure.security.password import BcryptPasswordService

    return AuthUseCase(
        user_repository=user_repo,
        password_service=BcryptPasswordService(),
        jwt_service=JoseJWTService(),
    )


def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if cred is None:
        raise credentials_exception

    try:
        jwt_service = JoseJWTService()
        payload = jwt_service.decode_token(cred.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except ValueError:
        raise credentials_exception

    repo = SQLAlchemyUserRepository(db)
    user = repo.find_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user_id
