'''FastAPI application entry point.'''

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base

# Configure logging for docflow modules
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Add project root to path for cross-module imports (engine)
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
# Add vendor dir (doc-flow core package) to path
vendor_dir = Path(__file__).resolve().parent.parent / "vendor"
if str(vendor_dir) not in sys.path:
    sys.path.insert(0, str(vendor_dir))

# Load vendor .env (LLM_API_KEY, LLM_BASE_URL, etc.) from the work directory
# before vendor modules are imported, so settings reads work on startup.
_work_path = Path(os.getenv("SIRCHMUNK_WORK_PATH", os.path.expanduser("~/.sirchmunk"))).expanduser().resolve()
_env_file = _work_path / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(str(_env_file), override=False)
    except ImportError:
        pass

from app.api.auth import router as auth_router
from app.api.templates import router as templates_router
from app.api.variables import router as variables_router
from app.api.documents import router as documents_router
from app.api.tasks import router as tasks_router
from app.api.users import router as users_router

# doc-flow knowledge/chat routers (vendor)
from sirchmunk.api.knowledge import router as knowledge_router
from sirchmunk.api.files import router as files_router
from sirchmunk.api.settings import router as settings_router
from sirchmunk.api.history import router as history_router
from sirchmunk.api.history import dashboard_router
from sirchmunk.api.monitor import router as monitor_router
from sirchmunk.api.search import router as search_router
from sirchmunk.api.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    import app.models  # noqa: ensure models are registered
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Enforce JWT auth on /api/v1/* routes (doc-flow APIs)."""
    path = request.url.path
    if path.startswith("/api/v1/") and request.method != "OPTIONS":
        # UI settings is fetched pre-auth by the frontend; token still required for mutations
        exempt_get = path == "/api/v1/settings/ui" and request.method == "GET"
        if not exempt_get:
            from app.services.auth import decode_access_token
            auth = request.headers.get("Authorization", "")
            token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
            payload = decode_access_token(token) if token else None
            if payload is None:
                return JSONResponse(status_code=401, content={"detail": "无效的认证令牌"})
    return await call_next(request)


app.include_router(auth_router)
app.include_router(templates_router)
app.include_router(variables_router)
app.include_router(documents_router)
app.include_router(tasks_router)
app.include_router(users_router)

# doc-flow knowledge/chat routers
app.include_router(knowledge_router)
app.include_router(files_router)
app.include_router(settings_router)
app.include_router(history_router)
app.include_router(dashboard_router)
app.include_router(monitor_router)
app.include_router(search_router)
app.include_router(chat_router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": settings.APP_VERSION}
