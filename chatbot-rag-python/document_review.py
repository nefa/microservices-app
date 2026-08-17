"""The pending_document review workflow. Approving moves a submission's
content into document_chunk via the same chunk+embed pipeline
/documents/ingest already uses in main.py - there's only one way content
becomes searchable in this service, whether it arrives through direct
ingest or through approval. Rejecting just records who rejected it and
why. Neither approve nor reject deletes the pending_document row - see
database.py's PendingDocument comment on why it's kept either way (an
audit trail of who submitted/reviewed what, not just a work queue).

Role checking (only a manager may call approve/reject) happens in
gateway-nest, not here - same trust model as everything else in this
service: chatbot-rag-python never re-derives an authorization decision
gateway-nest already made, it just trusts whoever holds the internal key
to have made it correctly (see main.py's verify_internal_request).
"""

from datetime import datetime, timezone

from pydantic import BaseModel
from sqlalchemy.orm import Session

from chunking import parse_csv, parse_pdf
from database import DocumentChunk, PendingDocument
from embeddings import embed_text


class DocumentNotFoundError(Exception):
    pass


class DocumentAlreadyReviewedError(Exception):
    pass


class PendingDocumentSummary(BaseModel):
    id: int
    sourceFilename: str
    format: str
    submittedBy: str
    createdAt: str


class ApproveResponse(BaseModel):
    chunksStored: int


def list_pending(session: Session) -> list[PendingDocumentSummary]:
    # Deliberately not scoped to a single user_id, unlike chat_router.py's
    # structured queries - a manager reviews everyone's submissions, not
    # just their own. Oldest-first, so nothing sits waiting indefinitely
    # while newer submissions keep getting reviewed first.
    rows = (
        session.query(PendingDocument)
        .filter(PendingDocument.status == "pending")
        .order_by(PendingDocument.created_at.asc())
        .all()
    )

    return [
        PendingDocumentSummary(
            id=row.id,
            sourceFilename=row.source_filename,
            format=row.format,
            submittedBy=row.submitted_by,
            createdAt=row.created_at.isoformat(),
        )
        for row in rows
    ]


def _load_pending(document_id: int, session: Session) -> PendingDocument:
    document = session.get(PendingDocument, document_id)
    if document is None:
        raise DocumentNotFoundError()
    if document.status != "pending":
        raise DocumentAlreadyReviewedError()
    return document


def approve(document_id: int, reviewer_id: str, session: Session) -> ApproveResponse:
    document = _load_pending(document_id, session)

    chunks = parse_pdf(document.content) if document.format == "pdf" else parse_csv(document.content)

    chunks_stored = 0
    for chunk in chunks:
        session.add(
            DocumentChunk(
                source_filename=document.source_filename,
                format=document.format,
                # Ownership follows the original submitter, not the
                # reviewer - the point of approval is that the
                # *submitter's* chat queries can now find this content
                # (chat_router.py's structured/semantic paths both scope
                # by user_id), not the manager's.
                user_id=document.submitted_by,
                content=chunk,
                embedding=embed_text(chunk),
            )
        )
        chunks_stored += 1

    document.status = "approved"
    document.reviewed_by = reviewer_id
    document.reviewed_at = datetime.now(timezone.utc)
    session.commit()

    return ApproveResponse(chunksStored=chunks_stored)


def reject(document_id: int, reviewer_id: str, reason: str, session: Session) -> None:
    document = _load_pending(document_id, session)

    document.status = "rejected"
    document.reviewed_by = reviewer_id
    document.reviewed_at = datetime.now(timezone.utc)
    document.rejection_reason = reason
    session.commit()
