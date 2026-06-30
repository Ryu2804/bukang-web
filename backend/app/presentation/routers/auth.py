from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.auth_use_case import AuthUseCase, RegisterRequest, LoginRequest
from app.presentation.dependencies import get_auth_use_case
from app.presentation.schemas.auth import RegisterRequest as RegisterSchema, LoginRequest as LoginSchema
from app.presentation.schemas.response import (
    TokenResponseSchema,
    UserResponseSchema,
    common_error,
    success,
)

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
def register(
    req: RegisterSchema,
    auth_use_case: AuthUseCase = Depends(get_auth_use_case),
):
    try:
        result = auth_use_case.register(
            RegisterRequest(username=req.username, password=req.password)
        )
        return success({"id": result.id, "username": result.username})
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


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
def login(
    req: LoginSchema,
    auth_use_case: AuthUseCase = Depends(get_auth_use_case),
):
    try:
        result = auth_use_case.login(
            LoginRequest(username=req.username, password=req.password)
        )
        return success(
            {"access_token": result.access_token, "token_type": "bearer"}
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        )
