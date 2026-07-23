from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.adapters.urja_client import UrjaClient
from app.repositories.cache import CacheRepository
from app.api.v1.auth import router as auth_router
from app.api.v1.meters import router as meters_router
from app.api.v1.hierarchy import router as hierarchy_router

# Setup structured logs
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Urja Wrapper API dependencies...")
    
    # Instantiate singleton components
    app.state.urja_client = UrjaClient()
    app.state.cache_repository = CacheRepository()
    
    logger.info("Service dependencies initialized successfully.")
    
    yield
    
    # Shutdown actions
    logger.info("Shutting down Urja Wrapper API services...")
    await app.state.urja_client.close()
    if app.state.cache_repository.redis_client:
        await app.state.cache_repository.redis_client.close()
    logger.info("Clean shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    description="A production-grade REST API wrapper over the legacy Urja Meter Ops portal.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(meters_router, prefix="/api/v1")
app.include_router(hierarchy_router, prefix="/api/v1")

@app.get("/health", tags=["System"])
async def health_check():
    """System health check including connectivity checks to Redis and Legacy portal."""
    redis_status = "unconfigured"
    redis_alive = False
    
    if app.state.cache_repository:
        redis_alive = await app.state.cache_repository.ping_redis()
        redis_status = "healthy" if redis_alive else "disconnected"
        
    portal_alive = False
    try:
        # Quick check if legacy portal is reachable
        async with app.state.urja_client.client as client:
            resp = await client.get("/legacy/login", timeout=2.0)
            portal_alive = (resp.status_code == 200)
    except Exception:
        pass
        
    status = "healthy" if (portal_alive and (not settings.REDIS_URL or redis_alive)) else "degraded"
    
    return {
        "status": status,
        "legacy_portal_connected": portal_alive,
        "redis_cache": {
            "status": redis_status,
            "connected": redis_alive
        }
    }
