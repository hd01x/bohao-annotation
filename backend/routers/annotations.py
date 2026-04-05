from fastapi import APIRouter, HTTPException, Query
from backend.services import annotation_store, data_loader
from backend.services.randomizer import get_shuffled_claim_order
from typing import Optional

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


# Static routes MUST come before parameterized routes
@router.get("/shuffle/{uid}/{annotator}")
def get_shuffle_order(uid: str, annotator: str):
    s1 = data_loader.get_stage1(uid)
    if not s1:
        sample = data_loader.get_sample(uid)
        if not sample:
            raise HTTPException(404, "Sample not found")
        claim_ids = [f"C{i+1}" for i in range(len(sample.get("claims", [])))]
    else:
        claim_ids = [c["id"] for c in s1.get("labeled_claims", [])]
    order = get_shuffled_claim_order(uid, annotator, claim_ids)
    return {"order": order}


@router.post("/stage1")
def save_stage1(body: dict):
    path = annotation_store.save_annotation(1, body)
    return {"status": "ok", "path": str(path)}


@router.post("/stage2")
def save_stage2(body: dict):
    path = annotation_store.save_annotation(2, body)
    return {"status": "ok", "path": str(path)}


@router.post("/stage3")
def save_stage3(body: dict):
    path = annotation_store.save_annotation(3, body)
    return {"status": "ok", "path": str(path)}


@router.get("/{stage}/{annotator}/{uid}")
def load_annotation(stage: int, annotator: str, uid: str):
    ann = annotation_store.load_annotation(stage, annotator, uid)
    if not ann:
        raise HTTPException(404, "Annotation not found")
    return ann
