from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RESULT_DIR = BASE_DIR / "result"

MODELS = ["qwen3-30b-instruct"]
DEFAULT_MODEL = "qwen3-30b-instruct"
DATASETS = ["medhop", "musique", "wiki2mhqa"]
STAGES = [1, 2, 3]
