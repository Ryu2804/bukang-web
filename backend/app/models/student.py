import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text

from app.db.base import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nrp = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hometown = Column(String, nullable=True)
    major = Column(String, nullable=False)
    photo_url = Column(Text, nullable=True)
    hobbies = Column(Text, nullable=True)
    first_impression = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
