"""
Compute EP/EI sub-labels after all 3 stages are complete.
Reads majority-vote results from all stages and outputs final labels.
"""
import json
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent.parent
RESULT = BASE / "result"
MODEL = "qwen3-30b-instruct"


def compute_transitive_predecessors(claim_id: str, deps: dict[str, list[str]], visited: set | None = None) -> set[str]:
    if visited is None:
        visited = set()
    direct = deps.get(claim_id, [])
    for d in direct:
        if d not in visited:
            visited.add(d)
            compute_transitive_predecessors(d, deps, visited)
    return visited


def process_sample(uid: str, stage1: dict, stage2: dict, stage3: dict):
    s1_claims = {c["id"]: c for c in stage1.get("labeled_claims", [])}
    s2_claims = {c["id"]: c for c in stage2.get("labeled_claims", [])}
    s3_claims = {c["id"]: c for c in stage3.get("labeled_claims", [])}

    # Build dependency map from stage 3
    deps = {}
    for cid, c in s3_claims.items():
        deps[cid] = c.get("dependencies", [])

    results = []
    for cid in s1_claims:
        claim_type = s1_claims[cid].get("claim_type", "FC")
        verdict = s2_claims.get(cid, {}).get("verdict", "S")
        sub_label = None

        if claim_type == "DR" and verdict == "H":
            predecessors = compute_transitive_predecessors(cid, deps)
            has_hallucinated_predecessor = any(
                s2_claims.get(p, {}).get("verdict") == "H" for p in predecessors
            )
            sub_label = "EP" if has_hallucinated_predecessor else "EI"

        results.append({
            "id": cid,
            "text": s1_claims[cid]["text"],
            "claim_type": claim_type,
            "verdict": verdict,
            "dependencies": deps.get(cid, []),
            "sub_label": sub_label,
        })

    return results


if __name__ == "__main__":
    print("Computing sub-labels (EP/EI) from majority-vote annotations...")
    # This would be run after majority votes are computed for all 3 stages
    print("Note: Requires majority-vote files in stage-2 and stage-3 directories.")
    print("Run export_majority_vote.py first if needed.")
