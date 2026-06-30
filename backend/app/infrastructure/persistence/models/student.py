import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text, Float, ForeignKey

from app.db.base import Base


class StudentModel(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    nrp = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    hometown = Column(String, nullable=True)
    major = Column(String, nullable=False)
    photo_url = Column(Text, nullable=True)
    hobbies = Column(Text, nullable=True)
    first_impression = Column(Text, nullable=True)
    longitude = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    captured_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
