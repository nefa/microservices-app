from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

from chat_router import ChatResponse, handle_semantic_query, handle_structured_query, is_structured_query
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


# Structured queries (see chat_router.py) hit document_chunk directly -
# "give me the latest entries" is a plain SQL question, not a similarity
# search. Everything else now goes through semantic search (embed the
# question, pgvector cosine similarity against document_chunk) instead
# of the old echo - see chat_router.py's module docstring for why that's
# retrieval only, no generation/LLM involved.
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user_id: str = Depends(verify_internal_request)):
    session = SessionLocal()
    try:
        if is_structured_query(request.message):
            return handle_structured_query(request.message, user_id, session)

        return handle_semantic_query(request.message, user_id, session)
    finally:
        session.close()


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
