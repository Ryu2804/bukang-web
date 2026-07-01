from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.presentation.dependencies import get_current_user
from app.presentation.schemas.response import (
    StudentResponseSchema,
    common_error,
    success,
)
from app.presentation.schemas.student import (
    SubmissionRequest,
)
from app.application.use_cases import student_use_case

router = APIRouter(prefix="/api/students", tags=["students"])

# --- Public endpoints (no auth) ---


@router.get(
    "/nrp/{nrp}",
    summary="Resolve NRP to name & major (public)",
    responses={
        200: {"description": "NRP data resolved"},
        404: {"description": "NRP not found"},
    },
)
def resolve_nrp(nrp: str, db: Session = Depends(get_db)):
    data = student_use_case.resolve_nrp_data(nrp, db)
    if data["name"] == "Unknown":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NRP not found")
    return success(data)


@router.post(
    "/upload-photo",
    summary="Upload photo (public)",
    responses={
        200: {"description": "Photo uploaded"},
    },
)
def upload_photo(file: UploadFile):
    url = student_use_case.save_photo(file)
    return success({"photo_url": url})


# --- Protected endpoints (auth required) ---


@router.post(
    "/submissions",
    status_code=201,
    summary="Submit complete student profile",
    responses={
        201: {"model": StudentResponseSchema, "description": "Submission created"},
        400: {"description": "Invalid data"},
    },
)
def submit_profile(
    data: SubmissionRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    student = student_use_case.create_submission(db, user_id, data)
    return success(student)


@router.get(
    "",
    summary="List own submissions or search by NRP",
    responses={
        **common_error,
        200: {
            "model": StudentResponseSchema,
            "description": "List of submissions",
        },
    },
)
def list_students(
    nrp: str | None = Query(
        None, description="Search own submissions by NRP (partial match)"
    ),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    if nrp:
        return success(student_use_case.search_students_by_nrp(db, user_id, nrp))
    return success(student_use_case.get_students(db, user_id))


@router.get(
    "/submissions/{submission_id}",
    summary="Get a single submission by ID",
    responses={
        200: {"description": "Submission found"},
        404: {"description": "Submission not found"},
        **common_error,
    },
)
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    student = student_use_case.get_submission_by_id(db, user_id, submission_id)
    return success(student)


@router.put(
    "/submissions/{submission_id}",
    summary="Update an existing submission",
    responses={
        200: {"description": "Submission updated"},
        404: {"description": "Submission not found"},
        **common_error,
    },
)
def update_submission(
    submission_id: str,
    data: SubmissionRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    student = student_use_case.update_submission(db, user_id, submission_id, data)
    return success(student)


@router.get(
    "/roster",
    summary="Get full roster (NRP map + submission status) with pagination",
)
def get_roster(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query("", description="Search by NRP or name"),
    major: str = Query("", description="Filter by major (exact match)"),
    status: str = Query("", description='Filter by submission status: "submitted", "pending", or empty for all'),
    all: bool = Query(False, description="Return all matching entries without pagination"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    data = student_use_case.get_roster(db, user_id, page, per_page, search, major, status, all_=all)
    return success(data)
