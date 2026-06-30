from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.logging import setup_logging
from app.db.base import Base
from app.db.session import engine
from app.routers import auth, students
from app.schemas.response import error, success

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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
