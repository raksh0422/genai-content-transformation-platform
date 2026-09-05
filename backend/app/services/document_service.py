"""Document orchestration service."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.services.processing import chunk_blocks, extract_text
from app.services.storage_service import StorageService
from app.utils.id_generator import generate_document_id, generate_storage_filename

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Orchestrates the document lifecycle:
      upload → store → extract → chunk → persist
    """

    def __init__(self, settings: Settings, storage: StorageService) -> None:
        self._settings = settings
        self._storage = storage

    # ------------------------------------------------------------------
    # Upload phase
    # ------------------------------------------------------------------

    async def create_document_record(
        self,
        db: AsyncSession,
        original_filename: str,
        extension: str,
        file_size_bytes: int,
        mime_type: str,
        storage_path: str,
        user_id: str = "usr_demo_default",
    ) -> Document:
        """
        Persist a new Document row with status='uploaded'.

        Args:
            db: Active database session.
            original_filename: The filename as submitted by the user.
            extension: Lowercased file extension (e.g. '.pdf').
            file_size_bytes: Raw byte count.
            mime_type: Detected or submitted MIME type.
            storage_path: Path where the file was written in storage.
            user_id: ID of the user owning the document.

        Returns:
            Persisted Document ORM instance.
        """
        doc_id = generate_document_id()
        storage_filename = generate_storage_filename(doc_id, extension)

        doc = Document(
            id=doc_id,
            user_id=user_id,
            filename=storage_filename,
            original_filename=original_filename,
            file_extension=extension,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            status="uploaded",
            storage_path=storage_path,
        )
        db.add(doc)
        await db.flush()  # get the DB-assigned defaults without committing
        logger.info("Document record created: id=%s user_id=%s filename=%s", doc_id, user_id, storage_filename)
        return doc

    # ------------------------------------------------------------------
    # Processing phase (runs in background)
    # ------------------------------------------------------------------

    async def process_document(
        self,
        document_id: uuid.UUID,
        db: AsyncSession,
    ) -> None:
        """
        Full processing pipeline for an uploaded document.

        Updates status to 'processing', runs extraction + chunking,
        persists chunks, then sets status to 'completed' or 'failed'.

        Args:
            document_id: UUID of the document to process.
            db: Active database session (a fresh session is recommended).
        """
        # Load the document
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        doc: Optional[Document] = result.scalar_one_or_none()
        if doc is None:
            logger.error("process_document: document %s not found", document_id)
            return

        # Mark as processing
        doc.status = "processing"
        doc.updated_at = datetime.now(timezone.utc)
        await db.flush()
        logger.info("Processing document: id=%s ext=%s", document_id, doc.file_extension)

        try:
            # Read raw bytes from storage
            content = await self._storage.read(doc.filename)

            # Extract text
            extraction = extract_text(content, doc.file_extension)

            # Chunk the extracted blocks
            text_chunks = chunk_blocks(
                extraction.blocks,
                chunk_size=self._settings.chunk_size_tokens,
                overlap=self._settings.chunk_overlap_tokens,
                encoding_name=self._settings.tiktoken_encoding,
            )

            # Persist chunks & collect saved chunk objects
            saved_chunks: list[DocumentChunk] = []
            for chunk in text_chunks:
                db_chunk = DocumentChunk(
                    id=uuid.uuid4(),
                    document_id=document_id,
                    chunk_index=chunk.chunk_index,
                    text=chunk.text,
                    token_count=chunk.token_count,
                    page_number=chunk.page_number,
                    slide_number=chunk.slide_number,
                    chunk_type=chunk.chunk_type,
                )
                db.add(db_chunk)
                saved_chunks.append(db_chunk)

            await db.flush()

            # Phase 2: Vector Indexing
            try:
                from app.services.retrieval_service import get_retrieval_service
                retrieval_svc = get_retrieval_service(self._settings)
                await retrieval_svc.index_document_chunks(document_id, saved_chunks)
            except Exception as index_exc:
                logger.warning("Vector indexing encountered warning for doc %s: %s", document_id, index_exc)

            # Update document metadata
            doc.status = "completed"
            doc.page_count = extraction.page_count
            doc.word_count = extraction.word_count
            doc.chunk_count = len(text_chunks)
            doc.updated_at = datetime.now(timezone.utc)
            await db.flush()

            logger.info(
                "Document %s processed & indexed successfully: %d chunks, %d words",
                document_id,
                len(text_chunks),
                extraction.word_count,
            )

        except Exception as exc:
            logger.exception("Failed to process document %s: %s", document_id, exc)
            doc.status = "failed"
            doc.error_message = str(exc)[:1024]
            doc.updated_at = datetime.now(timezone.utc)
            await db.flush()

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    async def get_document(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        user_id: Optional[str] = None,
    ) -> Optional[Document]:
        """Fetch a single document by ID with optional tenant user_id filtering."""
        query = select(Document).where(Document.id == document_id)
        if user_id:
            query = query.where(Document.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_documents(
        self,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        user_id: Optional[str] = None,
    ) -> Tuple[List[Document], int]:
        """
        Return a paginated list of documents and total count filtered by user_id.

        Returns:
            (documents, total_count)
        """
        from sqlalchemy import func

        count_query = select(func.count()).select_from(Document)
        docs_query = select(Document).order_by(Document.created_at.desc())

        if user_id:
            count_query = count_query.where(Document.user_id == user_id)
            docs_query = docs_query.where(Document.user_id == user_id)

        count_result = await db.execute(count_query)
        total = count_result.scalar_one()

        docs_result = await db.execute(docs_query.limit(limit).offset(offset))
        docs = list(docs_result.scalars().all())
        return docs, total

    async def get_document_chunks(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
    ) -> List[DocumentChunk]:
        """Fetch all chunks for a document, ordered by chunk_index."""
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        )
        return list(result.scalars().all())

    async def delete_document(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        user_id: Optional[str] = None,
    ) -> bool:
        """
        Permanently delete a document and all associated data.

        Deletes (in order):
          - Storage file
          - DocumentChunk rows
          - Transformation rows (and their verification reports via cascade)
          - Document row

        Returns True if deleted, False if not found.
        """
        from sqlalchemy import delete as sql_delete

        doc = await self.get_document(db, document_id, user_id=user_id)
        if doc is None:
            return False

        # 1. Remove file from storage (best-effort)
        try:
            await self._storage.delete(doc.filename)
        except Exception as exc:
            logger.warning("Could not delete storage file %s: %s", doc.filename, exc)

        # 2. Delete chunks
        await db.execute(
            sql_delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )

        # 3. Delete transformations (and their verification reports if cascade is set;
        #    otherwise delete verification reports first)
        try:
            from app.models.transformation import Transformation
            from app.models.verification import VerificationReport, VerifiedClaim
            # Delete verified claims for all transformations of this document
            tf_ids_result = await db.execute(
                select(Transformation.id).where(Transformation.document_id == document_id)
            )
            tf_ids = [row[0] for row in tf_ids_result.fetchall()]
            if tf_ids:
                for tf_id in tf_ids:
                    # Delete claims
                    await db.execute(
                        sql_delete(VerifiedClaim).where(VerifiedClaim.transformation_id == tf_id)
                    )
                    # Delete verification report
                    await db.execute(
                        sql_delete(VerificationReport).where(VerificationReport.transformation_id == tf_id)
                    )
            # Delete transformations
            await db.execute(
                sql_delete(Transformation).where(Transformation.document_id == document_id)
            )
        except Exception as exc:
            logger.warning("Could not delete transformations/verification for doc %s: %s", document_id, exc)

        # 4. Delete the document record itself
        await db.execute(
            sql_delete(Document).where(Document.id == document_id)
        )
        await db.flush()
        logger.info("Document %s and all associated data deleted.", document_id)
        return True
