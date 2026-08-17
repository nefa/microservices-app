"""Integration tests for the pending_document review endpoints
(/documents/pending, /documents/{id}/approve, /documents/{id}/reject).

Same style/level as test_main.py: FastAPI's TestClient against the real
app, the real chatbot-postgres database, and the real chunk+embed
pipeline (approve() calls the actual chunking.py/embeddings.py code, not
a stub) - nothing mocked, but no real HTTP hop and no gateway-nest (the
role check that makes these manager-only in practice lives there, not
here - see document_review.py's module docstring).

Run with: venv/bin/pytest -v
"""

import csv
import io

import pytest
from fastapi.testclient import TestClient

from database import DocumentChunk, PendingDocument, SessionLocal
from main import INTERNAL_API_KEY, app

client = TestClient(app)

# Distinct from test_main.py's TEST_USER_ID and from each other - the
# submitter and reviewer are different people in this workflow, and
# using different ids for each role here catches a mix-up (e.g.
# approve() accidentally attributing chunks to the reviewer instead of
# the submitter) that reusing one id for both would hide.
SUBMITTER_ID = "e2e-review-submitter"
REVIEWER_ID = "e2e-review-manager"


def _csv_bytes(rows: list[tuple[str, str]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["company", "note"])
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def _headers(user_id: str = REVIEWER_ID, api_key: str = INTERNAL_API_KEY) -> dict:
    return {"X-Internal-Api-Key": api_key, "X-User-Id": user_id}


@pytest.fixture
def pending_document():
    # Real CSV bytes, real PendingDocument row - approve() has to
    # actually parse this successfully (via chunking.parse_csv), not
    # just flip a status flag, so the fixture needs content that's
    # genuinely parseable, not a placeholder string.
    session = SessionLocal()
    document = PendingDocument(
        source_filename="acme-review-test.csv",
        format="csv",
        content=_csv_bytes([("Acme Corp", "Signed a new supply contract in March 2026")]),
        submitted_by=SUBMITTER_ID,
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    document_id = document.id
    session.close()

    try:
        yield document_id
    finally:
        cleanup_session = SessionLocal()
        # Covers both outcomes - a rejected fixture never produces
        # chunks, an approved one does, deleting unconditionally handles
        # either without the teardown needing to know which happened.
        cleanup_session.query(DocumentChunk).filter(DocumentChunk.user_id == SUBMITTER_ID).delete()
        cleanup_session.query(PendingDocument).filter(PendingDocument.id == document_id).delete()
        cleanup_session.commit()
        cleanup_session.close()


def test_get_pending_includes_a_freshly_submitted_document(pending_document):
    response = client.get("/documents/pending", headers=_headers())
    assert response.status_code == 200

    ids = [item["id"] for item in response.json()]
    assert pending_document in ids


def test_approve_moves_content_into_document_chunk(pending_document):
    response = client.post(f"/documents/{pending_document}/approve", headers=_headers())
    assert response.status_code == 200
    assert response.json() == {"chunksStored": 1}

    session = SessionLocal()
    try:
        document = session.get(PendingDocument, pending_document)
        assert document.status == "approved"
        assert document.reviewed_by == REVIEWER_ID
        assert document.reviewed_at is not None

        chunks = session.query(DocumentChunk).filter(DocumentChunk.user_id == SUBMITTER_ID).all()
        assert len(chunks) == 1
        # Ownership follows the original submitter, not the reviewer -
        # this is the assertion that would catch approve() attributing
        # the chunk to the wrong person.
        assert chunks[0].user_id == SUBMITTER_ID
        assert "Acme Corp" in chunks[0].content
    finally:
        session.close()

    # No longer pending, once approved - the whole point of the status
    # flip is that a second reviewer doesn't see it in their queue.
    pending_response = client.get("/documents/pending", headers=_headers())
    assert pending_document not in [item["id"] for item in pending_response.json()]


def test_reject_records_reason_without_creating_chunks(pending_document):
    response = client.post(
        f"/documents/{pending_document}/reject",
        json={"reason": "Not relevant to this workspace."},
        headers=_headers(),
    )
    assert response.status_code == 204

    session = SessionLocal()
    try:
        document = session.get(PendingDocument, pending_document)
        assert document.status == "rejected"
        assert document.reviewed_by == REVIEWER_ID
        assert document.rejection_reason == "Not relevant to this workspace."

        chunks = session.query(DocumentChunk).filter(DocumentChunk.user_id == SUBMITTER_ID).all()
        assert chunks == []
    finally:
        session.close()


def test_approve_a_document_thats_already_been_reviewed_returns_409(pending_document):
    first = client.post(f"/documents/{pending_document}/approve", headers=_headers())
    assert first.status_code == 200

    second = client.post(f"/documents/{pending_document}/approve", headers=_headers())
    assert second.status_code == 409


def test_approve_nonexistent_document_returns_404():
    response = client.post("/documents/999999999/approve", headers=_headers())
    assert response.status_code == 404
