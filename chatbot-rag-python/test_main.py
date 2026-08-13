"""Integration tests for the /chat endpoint.

Uses FastAPI's TestClient (ASGI in-process, no uvicorn needed) against
the real app object, including its real dependency (verify_internal_
request) and the real chatbot-postgres database - the same DB
INSTRUCTIONS.md has you start via `docker compose up -d`. The DB and
app code are real (nothing mocked), but this never leaves the Python
process - no real HTTP/network hop, and gateway-nest (the actual
client-facing entry point) isn't involved. A true e2e test of this
feature would route through gateway-nest's real HTTP + JWT layer too;
this is the narrower "does chatbot-rag-python's own logic work against
a real DB" check.

Run with: venv/bin/pytest -v
"""

import pytest
from fastapi.testclient import TestClient

from database import DocumentChunk, SessionLocal
from embeddings import embed_text
from main import INTERNAL_API_KEY, app

client = TestClient(app)

# Own user id, distinct from any real seeded/demo user - keeps this
# test's assertions (0 documents, empty-state reply) safe from ever
# colliding with document_chunk rows a real login session ingested.
TEST_USER_ID = "e2e-test-user"


def _chat(message: str, *, api_key: str = INTERNAL_API_KEY, user_id: str = TEST_USER_ID):
    headers = {}
    if api_key is not None:
        headers["X-Internal-Api-Key"] = api_key
    if user_id is not None:
        headers["X-User-Id"] = user_id
    return client.post("/chat", json={"message": message}, headers=headers)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_rejects_missing_internal_headers():
    # No X-Internal-Api-Key/X-User-Id at all - FastAPI's Header(...)
    # validation rejects this before verify_internal_request's body ever
    # runs, hence 422 (missing required field) rather than 403.
    response = client.post("/chat", json={"message": "hello"})
    assert response.status_code == 422


def test_chat_rejects_wrong_internal_key():
    response = _chat("hello", api_key="not-the-real-key")
    assert response.status_code == 403


def test_chat_structured_count_query_for_a_user_with_no_documents():
    response = _chat("how many documents do I have?")
    assert response.status_code == 200

    body = response.json()
    assert body["type"] == "text"
    assert "0 document(s)" in body["reply"]
    assert "0 chunk(s)" in body["reply"]


def test_chat_structured_recent_documents_query_for_a_user_with_no_documents():
    # Empty-state branch of _handle_recent_documents - no document_chunk
    # rows exist for TEST_USER_ID, so this hits the "haven't ingested
    # anything yet" reply rather than a table.
    response = _chat("list my recent documents")
    assert response.status_code == 200

    body = response.json()
    assert body["type"] == "text"
    assert body["reply"] == "You haven't ingested any documents yet."
    assert body["data"] is None


@pytest.fixture
def seeded_chunk():
    # Real row, real embedding (the actual sentence-transformers model,
    # same as ingestion would produce) - not a mock. Torn down
    # unconditionally so this test's data can't leak into any other
    # test's "0 documents" assertions, regardless of run order.
    content = "Acme Corp signed a new supply contract in March 2026."
    session = SessionLocal()
    chunk = DocumentChunk(
        source_filename="acme-notes.pdf",
        format="pdf",
        user_id=TEST_USER_ID,
        content=content,
        embedding=embed_text(content),
    )
    session.add(chunk)
    session.commit()
    try:
        yield chunk
    finally:
        session.query(DocumentChunk).filter(DocumentChunk.user_id == TEST_USER_ID).delete()
        session.commit()
        session.close()


def test_chat_semantic_query_finds_a_matching_chunk(seeded_chunk):
    response = _chat("what do we know about acme corp's contracts?")
    assert response.status_code == 200

    body = response.json()
    assert body["type"] == "list"
    assert body["reply"] == "Found 1 relevant excerpt(s)."
    assert body["data"]["items"] == [
        {"title": "acme-notes.pdf", "snippet": "Acme Corp signed a new supply contract in March 2026."}
    ]


def test_chat_semantic_query_for_a_user_with_no_documents():
    # No structured keyword ("latest"/"recent"/"list"/"how many"/"count")
    # in this message, so it takes the semantic (pgvector similarity)
    # branch. TEST_USER_ID has no document_chunk rows, so this hits
    # handle_semantic_query's empty-state reply rather than actually
    # running a similarity search - still exercises the real routing
    # decision and the real (embedding-model-backed) code path up to
    # that point, just with nothing in the DB to match against.
    response = _chat("what do you know about acme corp")
    assert response.status_code == 200

    body = response.json()
    assert body["type"] == "text"
    assert body["reply"] == "You haven't ingested any documents yet, so there's nothing to search."
    assert body["data"] is None
