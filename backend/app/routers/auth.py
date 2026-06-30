from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.response import (
    TokenResponseSchema,
    UserResponseSchema,
    common_error,
    success,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    summary="Register a new user",
    responses={
        201: {
            "model": UserResponseSchema,
            "description": "User registered successfully",
        },
        400: {"description": "Username already taken"},
        **common_error,
    },
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    return success(auth_service.register_user(db, req))


@router.post(
    "/login",
    summary="Login and get access token",
    responses={
        **common_error,
        200: {
            "model": TokenResponseSchema,
            "description": "Login successful",
        },
        401: {"description": "Invalid username or password"},
    },
)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    return success(auth_service.login_user(db, req.username, req.password))
