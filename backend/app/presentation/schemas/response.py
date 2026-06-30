import uuid
from datetime import datetime, timezone

from pydantic import BaseModel

from app.presentation.schemas.auth import TokenResponse, UserResponse
from app.presentation.schemas.student import StudentResponse


def _request_id() -> str:
    return "req_" + uuid.uuid4().hex[:8]


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def success(data):
    return {
        "success": True,
        "data": data,
        "meta": {"request_id": _request_id(), "timestamp": _timestamp()},
    }


def error(detail: str, status_code: int = 400):
    return {
        "success": False,
        "data": {"detail": detail, "status_code": status_code},
        "meta": {"request_id": _request_id(), "timestamp": _timestamp()},
    }


# --- OpenAPI documentation models ---


class Meta(BaseModel):
    request_id: str
    timestamp: str


class StudentResponseSchema(BaseModel):
    success: bool = True
    data: StudentResponse
    meta: Meta


class StudentListResponseSchema(BaseModel):
    success: bool = True
    data: list[StudentResponse]
    meta: Meta


class MessageData(BaseModel):
    message: str


class MessageResponseSchema(BaseModel):
    success: bool = True
    data: MessageData
    meta: Meta


class TokenData(TokenResponse):
    pass


class TokenResponseSchema(BaseModel):
    success: bool = True
    data: TokenData
    meta: Meta


class UserData(BaseModel):
    id: str
    username: str


class UserResponseSchema(BaseModel):
    success: bool = True
    data: UserData
    meta: Meta


class ErrorDetail(BaseModel):
    detail: str
    status_code: int


class ErrorResponseSchema(BaseModel):
    success: bool = False
    data: ErrorDetail
    meta: Meta


common_error = {
    401: {"model": ErrorResponseSchema, "description": "Unauthorized"},
    422: {"model": ErrorResponseSchema, "description": "Validation Error"},
    500: {"model": ErrorResponseSchema, "description": "Internal Server Error"},
}
