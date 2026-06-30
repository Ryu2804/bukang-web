from datetime import datetime
from pydantic import BaseModel


class StudentCreate(BaseModel):
    nrp: str


class StudentUpdate(BaseModel):
    hometown: str | None = None
    hobbies: str | None = None
    first_impression: str | None = None
    photo_url: str | None = None


class StudentResponse(BaseModel):
    id: str
    nrp: str
    name: str | None = None
    major: str | None = None
    hometown: str | None = None
    hobbies: str | None = None
    first_impression: str | None = None
    photo_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
