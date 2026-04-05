import random


def get_shuffled_claim_order(uid: str, annotator: str, claim_ids: list[str]) -> list[str]:
    seed = hash(f"{uid}:{annotator}") & 0xFFFFFFFF
    rng = random.Random(seed)
    shuffled = list(claim_ids)
    rng.shuffle(shuffled)
    return shuffled
