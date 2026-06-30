import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.logging import setup_logging
from app.db.base import Base
from app.db.session import engine
from app.presentation.routers import auth, students
from app.presentation.schemas.response import error, success

tags_metadata = [
    {
        "name": "health",
        "description": "Health check endpoint",
    },
    {
        "name": "auth",
        "description": "User registration and authentication",
    },
    {
        "name": "students",
        "description": "Student CRUD operations",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Student Profile Collection API — Kumpulkan Profil Mahasiswa dalam satu tempat",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    swagger_ui_parameters={"persistAuthorization": True},
)

origins = (
    settings.cors_origins.split(",")
    if settings.cors_origins != "*"
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.detail, exc.status_code),
    )


@app.exception_handler(Exception)
def generic_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=error("Internal server error", 500),
    )


os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(students.router)


@app.get(
    "/api/health",
    tags=["health"],
    summary="Check API health",
    responses={
        200: {"description": "API is healthy"},
    },
)
def health():
    return success({"status": "ok"})
