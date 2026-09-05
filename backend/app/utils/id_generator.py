"""Document ID generation."""
import uuid


def generate_document_id() -> uuid.UUID:
    """Generate a new UUID v4 document identifier."""
    return uuid.uuid4()


def generate_storage_filename(doc_id: uuid.UUID, extension: str) -> str:
    """
    Derive a deterministic, safe storage filename from a document ID.

    Args:
        doc_id: The document UUID.
        extension: Lowercased file extension including the dot (e.g. '.pdf').

    Returns:
        Storage filename string, e.g. '3f2e1a00-...-abc.pdf'
    """
    return f"{doc_id}{extension}"
