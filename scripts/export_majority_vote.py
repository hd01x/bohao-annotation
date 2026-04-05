"""
Merge 3 annotators' results into majority vote for a given stage.
Usage: python scripts/export_majority_vote.py --stage 2
"""
import json
import argparse
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent.parent
RESULT = BASE / "result"
MODEL = "qwen3-30b-instruct"
DATASETS = ["medhop", "musique", "wiki2mhqa"]


def majority_vote_stage2(annotators: list[str]):
    out_dir = RESULT / "stage-2" / MODEL / "majority_vote"
    for ds in DATASETS:
        (out_dir / ds).mkdir(parents=True, exist_ok=True)
        # Collect all UIDs annotated by all annotators
        uid_files: dict[str, list[dict]] = {}
        for ann in annotators:
            ann_dir = RESULT / "stage-2" / MODEL / ann / ds
            if not ann_dir.exists():
                continue
            for f in ann_dir.glob("*.json"):
                uid = f.stem
                with open(f) as fh:
                    data = json.load(fh)
                uid_files.setdefault(uid, []).append(data)

        for uid, annotations in uid_files.items():
            if len(annotations) < 2:
                continue
            # Majority vote per claim
            claim_verdicts: dict[str, list[str]] = {}
            base = annotations[0]
            for ann_data in annotations:
                for c in ann_data.get("labeled_claims", []):
                    claim_verdicts.setdefault(c["id"], []).append(c.get("verdict", "S"))

            merged_claims = []
            for c in base.get("labeled_claims", []):
                votes = claim_verdicts.get(c["id"], [])
                counter = Counter(votes)
                majority = counter.most_common(1)[0][0] if counter else "S"
                merged_claims.append({
                    "id": c["id"],
                    "text": c["text"],
                    "verdict": majority,
                    "votes": dict(counter),
                    "annotator_labels": {
                        annotations[i]["annotator"]: claim_verdicts[c["id"]][i]
                        for i in range(len(annotations))
                        if i < len(claim_verdicts.get(c["id"], []))
                    },
                })

            out = {
                "uid": uid,
                "dataset": ds,
                "stage": 2,
                "labeled_claims": merged_claims,
            }
            with open(out_dir / ds / f"{uid}.json", "w") as fh:
                json.dump(out, fh, indent=2, ensure_ascii=False)

    print(f"Stage 2 majority vote exported to {out_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", type=int, required=True)
    parser.add_argument("--annotators", nargs="+", default=None)
    args = parser.parse_args()

    if not args.annotators:
        # Auto-discover annotators
        stage_dir = RESULT / f"stage-{args.stage}" / MODEL
        annotators = [
            d.name for d in stage_dir.iterdir()
            if d.is_dir() and d.name != "majority_vote"
        ] if stage_dir.exists() else []
    else:
        annotators = args.annotators

    print(f"Merging annotations from: {annotators}")
    if args.stage == 2:
        majority_vote_stage2(annotators)
    else:
        print(f"Stage {args.stage} majority vote not yet implemented")
