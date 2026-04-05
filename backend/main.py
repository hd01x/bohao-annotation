from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.services import data_loader
from backend.routers import data, annotations, progress


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_loader.load_all()
    print(f"Loaded {len(data_loader._samples)} samples, {len(data_loader._stage1_majority)} stage-1 annotations")
    yield


app = FastAPI(title="PremGuard Annotation Tool", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router)
app.include_router(annotations.router)
app.include_router(progress.router)

# Serve frontend build if it exists
dist_path = Path(__file__).parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")
