import json
from pathlib import Path
from datetime import datetime, timezone
from backend.config import RESULT_DIR, DEFAULT_MODEL, DATASETS
from backend.services import data_loader


def _stage_dir(stage: int, annotator: str, dataset: str) -> Path:
    return RESULT_DIR / f"stage-{stage}" / DEFAULT_MODEL / annotator / dataset


def save_annotation(stage: int, data: dict) -> Path:
    uid = data["uid"]
    annotator = data["annotator"]
    sample = data_loader.get_sample(uid)
    dataset = sample["dataset"] if sample else data.get("dataset", "unknown")

    out_dir = _stage_dir(stage, annotator, dataset)
    out_dir.mkdir(parents=True, exist_ok=True)

    out = {
        "uid": uid,
        "sample_id": sample.get("sample_id", "") if sample else "",
        "dataset": dataset,
        "model_name": data.get("model", DEFAULT_MODEL),
        "annotator": annotator,
        "stage": stage,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "time_spent_seconds": data.get("time_spent_seconds", 0),
    }

    if stage == 2:
        out["presentation_order"] = data.get("presentation_order", [])

    out["labeled_claims"] = data.get("labeled_claims", [])

    path = out_dir / f"{uid}.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
    return path


def load_annotation(stage: int, annotator: str, uid: str) -> dict | None:
    sample = data_loader.get_sample(uid)
    if not sample:
        return None
    dataset = sample["dataset"]
    path = _stage_dir(stage, annotator, dataset) / f"{uid}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def get_annotated_uids(stage: int, annotator: str, dataset: str | None = None) -> list[str]:
    valid_uids = set(data_loader.get_all_uids(dataset))
    uids = []
    datasets = [dataset] if dataset else DATASETS
    for ds in datasets:
        d = _stage_dir(stage, annotator, ds)
        if d.exists():
            for f in d.glob("*.json"):
                if f.stem in valid_uids:
                    uids.append(f.stem)
    return uids


def get_all_annotators() -> list[str]:
    annotators = set()
    for stage in [1, 2, 3]:
        stage_dir = RESULT_DIR / f"stage-{stage}" / DEFAULT_MODEL
        if stage_dir.exists():
            for d in stage_dir.iterdir():
                if d.is_dir() and d.name != "majority_vote":
                    annotators.add(d.name)
    return sorted(annotators)


def get_next_uid(stage: int, annotator: str, dataset: str | None = None) -> str | None:
    all_uids = data_loader.get_all_uids(dataset)
    done = set(get_annotated_uids(stage, annotator, dataset))
    for uid in all_uids:
        if uid not in done:
            return uid
    return None
