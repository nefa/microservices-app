from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

from chunking import parse_csv, parse_pdf
from database import DocumentChunk, PendingDocument, SessionLocal, init_db
from embeddings import embed_text


# FastAPI's modern startup-hook mechanism (the older @app.on_event
# ("startup") decorator is deprecated). Code before `yield` runs once
# when the app starts - here, that's creating the document_chunk table
# if it doesn't exist yet (see database.py's init_db for the same
# synchronize:true-style caveat TypeORM has).
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Chatbot RAG Service", lifespan=lifespan)


# Shared secret with gateway-nest - must match INTERNAL_API_KEY in
# gateway-nest/src/chat/internal-api.constants.ts exactly. See that
# file's comment for why this can't have one shared source of truth
# across two different-language services.
#
# NOTE: hardcoded here for learning purposes, same caveat as everywhere
# else in this project - a real app would read this from an environment
# variable/secrets manager on both sides.
INTERNAL_API_KEY = "demo-only-internal-service-key-do-not-use-in-production"


# Pydantic's BaseModel is FastAPI's equivalent of the C# DTO records you
# used in TaskApi (CreateTaskDto, etc.) - a plain data shape that FastAPI
# uses to validate the incoming request body automatically and to
# generate the OpenAPI docs, the same role Data Annotations + records
# played on the .NET side.
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


# Field names are camelCase (not the usual Python snake_case convention)
# on purpose - this is a cross-language API contract, and
# frontend-angular's Documents.ingest() already expects exactly
# "filesIngested"/"chunksStored" in the JSON response.
class IngestResponse(BaseModel):
    filesIngested: int
    chunksStored: int


# Field name matches the same camelCase-contract reasoning as
# IngestResponse above.
class SubmitResponse(BaseModel):
    filesSubmitted: int


# Metadata only - deliberately no `content` field here. This is what
# populates ingestion-submitted-template's list; the raw bytes are only
# ever fetched one document at a time (open/download), not as part of a
# list response.
class PendingDocumentSummary(BaseModel):
    id: int
    sourceFilename: str
    format: str
    status: str
    submittedAt: datetime
    reviewedAt: datetime | None
    rejectionReason: str | None


# A FastAPI dependency - a reusable function any endpoint can require via
# Depends(...). This is this service's ONLY authentication: it never
# validates a JWT itself, it just checks that the caller holds the shared
# secret, then trusts whatever X-User-Id that caller says goes with this
# request. The header is only trustworthy BECAUSE the key check happens
# first - without that check, anyone could claim to be any user.
def verify_internal_request(
    x_internal_api_key: str = Header(...),
    x_user_id: str = Header(...),
) -> str:
    if x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key.")
    return x_user_id


@app.get("/health")
def health_check():
    return {"status": "ok"}


# No RAG pipeline or vector database wired up yet - this just proves the
# endpoint is reachable and the request/response shape works end-to-end
# (including through the gateway's auth) - real retrieval logic replaces
# this echo later.
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user_id: str = Depends(verify_internal_request)):
    return ChatResponse(reply=f"Echo (user {user_id}): {request.message}")


# Stores the raw upload for review - no chunking or embedding here, that
# only happens once a manager approves (see ARCHITECTURE.md's "Document
# review before ingestion" section). This is what
# frontend-angular's ingestion-submission-form will call once the
# gateway proxy in front of it is updated to point here instead of
# /documents/ingest.
@app.post("/documents/submit", response_model=SubmitResponse)
def submit_documents(
    format: str = Form(...),
    files: list[UploadFile] = File(...),
    user_id: str = Depends(verify_internal_request),
):
    if format not in ("pdf", "csv"):
        raise HTTPException(status_code=400, detail="format must be 'pdf' or 'csv'.")

    session = SessionLocal()
    try:
        for file in files:
            session.add(
                PendingDocument(
                    source_filename=file.filename,
                    format=format,
                    content=file.file.read(),
                    submitted_by=user_id,
                )
            )
        session.commit()
    finally:
        session.close()

    return SubmitResponse(filesSubmitted=len(files))


# Scoped to the caller's own submissions (submitted_by == user_id) - a
# submitter sees their own history, not everyone else's. The reviewer's
# equivalent (ingestion-review-template, all pending across every
# submitter) is a separate endpoint - not built yet.
@app.get("/documents/mine", response_model=list[PendingDocumentSummary])
def list_my_documents(user_id: str = Depends(verify_internal_request)):
    session = SessionLocal()
    try:
        documents = (
            session.query(PendingDocument)
            .filter(PendingDocument.submitted_by == user_id)
            .order_by(PendingDocument.created_at.desc())
            .all()
        )
        return [
            PendingDocumentSummary(
                id=doc.id,
                sourceFilename=doc.source_filename,
                format=doc.format,
                status=doc.status,
                submittedAt=doc.created_at,
                reviewedAt=doc.reviewed_at,
                rejectionReason=doc.rejection_reason,
            )
            for doc in documents
        ]
    finally:
        session.close()


@app.post("/documents/ingest", response_model=IngestResponse)
def ingest_documents(
    format: str = Form(...),
    files: list[UploadFile] = File(...),
    user_id: str = Depends(verify_internal_request),
):
    if format not in ("pdf", "csv"):
        raise HTTPException(status_code=400, detail="format must be 'pdf' or 'csv'.")

    session = SessionLocal()
    try:
        chunks_stored = 0

        for file in files:
            file_bytes = file.file.read()
            chunks = parse_pdf(file_bytes) if format == "pdf" else parse_csv(file_bytes)

            for chunk in chunks:
                session.add(
                    DocumentChunk(
                        source_filename=file.filename,
                        format=format,
                        user_id=user_id,
                        content=chunk,
                        # Embedding happens per-chunk at ingestion time,
                        # not per-request at query time - this is the
                        # expensive part of ingestion, but it means
                        # queries later only need to embed the (short)
                        # question, not re-embed every stored chunk.
                        embedding=embed_text(chunk),
                    )
                )
                chunks_stored += 1

        session.commit()
    finally:
        session.close()

    return IngestResponse(filesIngested=len(files), chunksStored=chunks_stored)
