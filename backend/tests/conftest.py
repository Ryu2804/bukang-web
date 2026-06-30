import os

os.environ["DATABASE_URL"] = "sqlite:///./test_bukang.db"

import pytest
from fastapi.testclient import TestClient

# Import models so they are registered with Base.metadata
from app.infrastructure.persistence.models.user import UserModel  # noqa: F401
from app.infrastructure.persistence.models.student import StudentModel  # noqa: F401

from app.db.base import Base
from app.db.session import engine
from app.main import app

# Create all tables
Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_db():
    yield
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        db.query(UserModel).delete()
        db.query(StudentModel).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def _cleanup_db_file():
    yield
    if os.path.exists("test_bukang.db"):
        os.remove("test_bukang.db")
