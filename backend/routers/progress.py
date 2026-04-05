from fastapi import APIRouter, Query
from backend.services import annotation_store, data_loader
from backend.config import DATASETS, DEFAULT_MODEL
from typing import Optional

router = APIRouter(prefix="/api", tags=["progress"])


@router.get("/progress/{stage}/{annotator}")
def get_progress(stage: int, annotator: str):
    datasets = {}
    overall_done = 0
    overall_total = 0
    for ds in DATASETS:
        all_uids = data_loader.get_all_uids(ds)
        done_uids = annotation_store.get_annotated_uids(stage, annotator, ds)
        datasets[ds] = {"total": len(all_uids), "done": len(done_uids)}
        overall_done += len(done_uids)
        overall_total += len(all_uids)
    return {
        "annotator": annotator,
        "stage": stage,
        "model": DEFAULT_MODEL,
        "datasets": datasets,
        "overall": {"total": overall_total, "done": overall_done},
    }


@router.get("/progress/overview")
def get_overview():
    annotators = annotation_store.get_all_annotators()
    result = {}
    for ann in annotators:
        result[ann] = {}
        for stage in [1, 2, 3]:
            done = len(annotation_store.get_annotated_uids(stage, ann))
            total = len(data_loader.get_all_uids())
            result[ann][f"stage{stage}"] = {"done": done, "total": total}
    return result


@router.get("/queue/{stage}/{annotator}")
def get_next(stage: int, annotator: str, dataset: Optional[str] = Query(None)):
    uid = annotation_store.get_next_uid(stage, annotator, dataset)
    if not uid:
        return {"uid": None, "message": "All samples annotated"}
    return {"uid": uid}


@router.get("/annotators")
def list_annotators():
    return annotation_store.get_all_annotators()
