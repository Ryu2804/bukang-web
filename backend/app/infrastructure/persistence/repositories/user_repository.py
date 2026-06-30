import uuid
from sqlalchemy.orm import Session

from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.persistence.models.user import UserModel


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, user_id: str) -> User | None:
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if model is None:
            return None
        return self._to_entity(model)

    def find_by_username(self, username: str) -> User | None:
        model = self._db.query(UserModel).filter(UserModel.username == username).first()
        if model is None:
            return None
        return self._to_entity(model)

    def save(self, user: User) -> User:
        model = UserModel(
            id=user.id or str(uuid.uuid4()),
            username=user.username,
            hashed_password=user.hashed_password,
        )
        self._db.add(model)
        self._db.commit()
        self._db.refresh(model)
        return self._to_entity(model)

    @staticmethod
    def _to_entity(model: UserModel) -> User:
        return User(
            id=model.id,
            username=model.username,
            hashed_password=model.hashed_password,
            created_at=model.created_at,
        )
