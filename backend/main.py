import yaml
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any

CONFIG_PATH = "config.yaml"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # lock down in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConfigRequest(BaseModel):
    config: Dict[str, Any]

@app.get("/config", response_model=Dict[str, Any])
def get_config():
    try:
        with open(CONFIG_PATH) as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        raise HTTPException(404, "config.yaml not found")

@app.post("/config")
def save_config(req: ConfigRequest):
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(req.config, f, sort_keys=False)
    return {"status": "ok"}

@app.get("/download")
def download_config():
    return FileResponse(CONFIG_PATH, media_type="application/x-yaml", filename="config.yaml")
