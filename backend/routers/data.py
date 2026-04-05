from fastapi import APIRouter, HTTPException, Query
from backend.services import data_loader
from typing import Optional

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/samples")
def list_samples(dataset: Optional[str] = Query(None)):
    return data_loader.get_index(dataset)


@router.get("/samples/{uid}")
def get_sample(uid: str):
    s = data_loader.get_sample(uid)
    if not s:
        raise HTTPException(404, "Sample not found")
    return s


@router.get("/samples/{uid}/stage1")
def get_stage1(uid: str):
    s = data_loader.get_stage1(uid)
    return s  # returns null/None when no stage-1 annotation exists — no 404
