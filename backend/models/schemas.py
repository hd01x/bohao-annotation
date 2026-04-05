from pydantic import BaseModel
from typing import Optional


class SampleIndex(BaseModel):
    uid: str
    sample_id: str
    dataset: str
    domain: str
    hop_count: int
    num_claims: int
    num_context: int
    has_stage1: bool


class ClaimLabel(BaseModel):
    id: str
    text: str
    claim_type: Optional[str] = None  # FC or DR (Stage 1/3)
    verdict: Optional[str] = None  # S or H (Stage 2)
    dependencies: Optional[list[str]] = None  # Stage 3


class Stage1Annotation(BaseModel):
    annotator: str
    model: str
    uid: str
    labeled_claims: list[ClaimLabel]
    time_spent_seconds: int = 0


class Stage2Annotation(BaseModel):
    annotator: str
    model: str
    uid: str
    labeled_claims: list[ClaimLabel]
    presentation_order: list[str]
    time_spent_seconds: int = 0


class Stage3Annotation(BaseModel):
    annotator: str
    model: str
    uid: str
    labeled_claims: list[ClaimLabel]
    time_spent_seconds: int = 0


class ProgressDataset(BaseModel):
    total: int
    done: int


class ProgressResponse(BaseModel):
    annotator: str
    stage: int
    model: str
    datasets: dict[str, ProgressDataset]
    overall: ProgressDataset
