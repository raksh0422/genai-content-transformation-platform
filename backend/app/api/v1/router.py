"""API v1 router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.retrieval import router as retrieval_router
from app.api.v1.endpoints.transformations import router as transformations_router
from app.api.v1.endpoints.verification import router as verification_router
from app.api.v1.endpoints.tools import router as tools_router

router = APIRouter(prefix="/api/v1")
router.include_router(health_router)
router.include_router(documents_router)
router.include_router(retrieval_router)
router.include_router(transformations_router)
router.include_router(verification_router)
router.include_router(tools_router)

