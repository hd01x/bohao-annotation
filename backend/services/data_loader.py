import json
from pathlib import Path
from backend.config import DATA_DIR, RESULT_DIR, DEFAULT_MODEL, DATASETS


_samples: dict[str, dict] = {}
_stage1_majority: dict[str, dict] = {}
_sample_index: list[dict] = []


def load_all():
    global _samples, _stage1_majority, _sample_index
    _samples.clear()
    _stage1_majority.clear()
    _sample_index.clear()

    for ds in DATASETS:
        ds_dir = DATA_DIR / DEFAULT_MODEL / ds
        if not ds_dir.exists():
            continue
        for f in sorted(ds_dir.glob("*.json")):
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
            uid = data["uid"]
            _samples[uid] = data

    # Load stage-1 majority vote
    mv_base = RESULT_DIR / "stage-1" / DEFAULT_MODEL / "majority_vote"
    if mv_base.exists():
        for ds in DATASETS:
            ds_dir = mv_base / ds
            if not ds_dir.exists():
                continue
            for f in sorted(ds_dir.glob("*.json")):
                with open(f, encoding="utf-8") as fh:
                    data = json.load(fh)
                uid = data["uid"]
                _stage1_majority[uid] = data

    # Build index
    for uid, s in _samples.items():
        _sample_index.append({
            "uid": uid,
            "sample_id": s.get("sample_id", ""),
            "dataset": s.get("dataset", ""),
            "domain": s.get("domain", ""),
            "hop_count": s.get("hop_count", 0),
            "num_claims": len(s.get("claims", [])),
            "num_context": len(s.get("context", [])),
            "has_stage1": uid in _stage1_majority,
        })

    _sample_index.sort(key=lambda x: (x["dataset"], x["uid"]))


def get_index(dataset: str | None = None) -> list[dict]:
    if dataset:
        return [s for s in _sample_index if s["dataset"] == dataset]
    return _sample_index


def get_sample(uid: str) -> dict | None:
    return _samples.get(uid)


def get_stage1(uid: str) -> dict | None:
    return _stage1_majority.get(uid)


def get_all_uids(dataset: str | None = None) -> list[str]:
    if dataset:
        return [s["uid"] for s in _sample_index if s["dataset"] == dataset]
    return [s["uid"] for s in _sample_index]
