"""Document API endpoints."""
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db, get_db_session
from app.schemas.document import DocumentListResponse, DocumentMetadataResponse, DocumentUploadResponse
from app.schemas.chunk import ChunkListResponse, ChunkResponse
from app.services.document_service import DocumentService
from app.services.storage_service import StorageService
from app.utils.file_validation import read_and_validate_upload
from app.utils.id_generator import generate_document_id, generate_storage_filename

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_storage(settings: Settings = Depends(get_settings)) -> StorageService:
    return StorageService(settings)


def _get_document_service(
    settings: Settings = Depends(get_settings),
    storage: StorageService = Depends(_get_storage),
) -> DocumentService:
    return DocumentService(settings, storage)


# ---------------------------------------------------------------------------
# POST /documents/upload
# ---------------------------------------------------------------------------


from app.core.auth import User, get_current_user


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a document for processing",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF, DOCX, PPTX or TXT file"),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: StorageService = Depends(_get_storage),
    doc_service: DocumentService = Depends(_get_document_service),
    current_user: User = Depends(get_current_user),
) -> DocumentUploadResponse:
    """
    Accept a document upload, persist it, and kick off background processing.

    Returns a 202 Accepted with the document ID and initial metadata.
    """
    # Validate
    content, extension = await read_and_validate_upload(file, settings)

    # Determine storage filename (pre-generate ID so we can derive the filename)
    doc_id = generate_document_id()
    storage_filename = generate_storage_filename(doc_id, extension)

    # Persist to storage
    saved_path = await storage.save(storage_filename, content)
    logger.info("Saved upload to %s", saved_path)

    # Determine MIME type from the upload content-type header (fallback to extension)
    mime_type = file.content_type or _extension_to_mime(extension)

    # Create DB record (override the auto-generated ID with our pre-generated one)
    doc = await doc_service.create_document_record(
        db=db,
        original_filename=file.filename or storage_filename,
        extension=extension,
        file_size_bytes=len(content),
        mime_type=mime_type,
        storage_path=str(saved_path),
        user_id=current_user.user_id,
    )
    # Overwrite the UUID generated inside the service with the one we derived
    # the filename from — keep them in sync
    doc.id = doc_id
    doc.filename = storage_filename
    await db.flush()

    # Queue background processing
    background_tasks.add_task(
        _run_processing_in_background,
        document_id=doc_id,
        settings=settings,
        storage=storage,
    )

    return DocumentUploadResponse.model_validate(doc)


async def _run_processing_in_background(
    document_id: uuid.UUID,
    settings: Settings,
    storage: StorageService,
) -> None:
    """Background task: open a fresh DB session and run the processing pipeline."""
    doc_service = DocumentService(settings, storage)
    async with get_db_session(settings) as db:
        await doc_service.process_document(document_id, db)


# ---------------------------------------------------------------------------
# GET /documents
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all documents",
)
async def list_documents(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    doc_service: DocumentService = Depends(_get_document_service),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """Return a paginated list of documents owned by current user."""
    docs, total = await doc_service.list_documents(
        db, limit=limit, offset=offset, user_id=current_user.user_id
    )
    return DocumentListResponse(
        total=total,
        items=[DocumentMetadataResponse.model_validate(d) for d in docs],
    )


# ---------------------------------------------------------------------------
# GET /documents/{document_id}
# ---------------------------------------------------------------------------


@router.get(
    "/{document_id}",
    response_model=DocumentMetadataResponse,
    summary="Get document metadata",
)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    doc_service: DocumentService = Depends(_get_document_service),
    current_user: User = Depends(get_current_user),
) -> DocumentMetadataResponse:
    """Return metadata for a specific document owned by current user."""
    doc = await doc_service.get_document(db, document_id, user_id=current_user.user_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found.",
        )
    return DocumentMetadataResponse.model_validate(doc)


# ---------------------------------------------------------------------------
# GET /documents/{document_id}/chunks
# ---------------------------------------------------------------------------


@router.get(
    "/{document_id}/chunks",
    response_model=ChunkListResponse,
    summary="Get processed chunks for a document",
)
async def get_document_chunks(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    doc_service: DocumentService = Depends(_get_document_service),
    current_user: User = Depends(get_current_user),
) -> ChunkListResponse:
    """Return all text chunks for a processed document owned by current user."""
    doc = await doc_service.get_document(db, document_id, user_id=current_user.user_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found.",
        )
    if doc.status not in ("completed", "processing"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Document is not yet processed (status={doc.status}).",
        )

    chunks = await doc_service.get_document_chunks(db, document_id)
    return ChunkListResponse(
        document_id=document_id,
        total_chunks=len(chunks),
        chunks=[ChunkResponse.model_validate(c) for c in chunks],
    )


# ---------------------------------------------------------------------------
# DELETE /documents/{document_id}
# ---------------------------------------------------------------------------


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    doc_service: DocumentService = Depends(_get_document_service),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Permanently delete a document and all associated chunks,
    transformations, and verification reports.
    """
    deleted = await doc_service.delete_document(db, document_id, user_id=current_user.user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found.",
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extension_to_mime(extension: str) -> str:
    """Fallback MIME type derivation from extension."""
    mapping = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain",
    }
    return mapping.get(extension, "application/octet-stream")
