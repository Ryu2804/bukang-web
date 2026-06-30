from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.response import (
    MessageResponseSchema,
    StudentListResponseSchema,
    StudentResponseSchema,
    common_error,
    success,
)
from app.schemas.student import StudentCreate, StudentUpdate
from app.services import student_service

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get(
    "",
    summary="List all students or search by NRP",
    responses={
        **common_error,
        200: {
            "model": StudentListResponseSchema,
            "description": "List of students",
        },
    },
)
def list_students(
    nrp: str | None = Query(None, description="Search students by NRP (partial match)"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if nrp:
        return success(student_service.search_students_by_nrp(db, nrp))
    return success(student_service.get_students(db))


@router.get(
    "/nrp/{nrp}",
    summary="Get a student by exact NRP",
    responses={
        **common_error,
        200: {
            "model": StudentResponseSchema,
            "description": "Student found",
        },
        404: {"description": "Student not found"},
    },
)
def get_student_by_nrp(
    nrp: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return success(student_service.get_student_by_nrp(db, nrp))


@router.get(
    "/{student_id}",
    summary="Get a student by internal ID",
    responses={
        **common_error,
        200: {
            "model": StudentResponseSchema,
            "description": "Student found",
        },
        404: {"description": "Student not found"},
    },
)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return success(student_service.get_student(db, student_id))


@router.post(
    "",
    status_code=201,
    summary="Create a new student by NRP",
    responses={
        **common_error,
        201: {
            "model": StudentResponseSchema,
            "description": "Student created",
        },
        400: {"description": "NRP already exists or invalid"},
    },
)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return success(student_service.create_student(db, data))


@router.put(
    "/{student_id}",
    summary="Update a student's profile fields",
    responses={
        **common_error,
        200: {
            "model": StudentResponseSchema,
            "description": "Student updated",
        },
        404: {"description": "Student not found"},
    },
)
def update_student(
    student_id: str,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return success(student_service.update_student(db, student_id, data))


@router.delete(
    "/{student_id}",
    status_code=200,
    summary="Delete a student",
    responses={
        **common_error,
        200: {
            "model": MessageResponseSchema,
            "description": "Student deleted",
        },
        404: {"description": "Student not found"},
    },
)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    student_service.delete_student(db, student_id)
    return success({"message": "Student deleted"})
