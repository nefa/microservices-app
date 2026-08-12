"""Routes an incoming chat message to a structured query (SQL) or, later,
semantic search (pgvector similarity - not built yet, see main.py).

Rule-based routing for now - plain keyword matching, no LLM involved. See
ARCHITECTURE.md's "Chat responses: semantic answers vs. structured
queries" section for why: forcing "how many documents do I have" through
vector similarity would return semantically-similar but not necessarily
correct results, and this decision doesn't need an LLM to make yet -
committing to a provider (OpenAI/Anthropic/local) is deliberately
deferred until semantic *generation* actually needs one.
"""

from typing import Literal

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import DocumentChunk

# Mirrors ARCHITECTURE.md's response `type` union - kept narrower than
# the doc's full text|table|chart|list|comparison set for now, since
# `chart`/`comparison` don't have a handler (or a frontend renderer) yet.
# frontend-angular needs a matching TypeScript union to switch on - same
# "keep two languages in sync by hand" situation as the internal API
# secret (no compiler check across the language boundary).
ChatResponseType = Literal["text", "table"]


class TableData(BaseModel):
    columns: list[str]
    rows: list[dict]


class Suggestion(BaseModel):
    label: str
    type: str


class ChatResponse(BaseModel):
    reply: str
    type: ChatResponseType = "text"
    data: TableData | None = None
    suggestions: list[Suggestion] = []


# Deliberately dumb substring matching, not NLP - see the module
# docstring. Expand/replace with something smarter once real usage shows
# this is too rigid, not before.
_STRUCTURED_KEYWORDS = ("latest", "recent", "list", "how many", "count")


def is_structured_query(message: str) -> bool:
    lowered = message.lower()
    return any(keyword in lowered for keyword in _STRUCTURED_KEYWORDS)


def handle_structured_query(message: str, user_id: str, session: Session) -> ChatResponse:
    lowered = message.lower()

    if "how many" in lowered or "count" in lowered:
        return _handle_count(user_id, session)

    return _handle_recent_documents(user_id, session)


def _handle_count(user_id: str, session: Session) -> ChatResponse:
    chunk_count = (
        session.query(func.count(DocumentChunk.id))
        .filter(DocumentChunk.user_id == user_id)
        .scalar()
    )
    document_count = (
        session.query(func.count(func.distinct(DocumentChunk.source_filename)))
        .filter(DocumentChunk.user_id == user_id)
        .scalar()
    )

    return ChatResponse(
        reply=f"You've ingested {document_count} document(s), {chunk_count} chunk(s) total.",
        suggestions=[Suggestion(label="List my recent documents", type="table")],
    )


def _handle_recent_documents(user_id: str, session: Session, limit: int = 5) -> ChatResponse:
    # One row per source_filename, most recently ingested first - a chunk
    # is an internal storage detail nobody asked about, so this groups
    # back up to the file level instead of listing raw chunks.
    rows = (
        session.query(
            DocumentChunk.source_filename,
            DocumentChunk.format,
            func.max(DocumentChunk.ingested_at).label("ingested_at"),
            func.count(DocumentChunk.id).label("chunks"),
        )
        .filter(DocumentChunk.user_id == user_id)
        .group_by(DocumentChunk.source_filename, DocumentChunk.format)
        .order_by(func.max(DocumentChunk.ingested_at).desc())
        .limit(limit)
        .all()
    )

    if not rows:
        return ChatResponse(reply="You haven't ingested any documents yet.")

    table_rows = [
        {
            "filename": row.source_filename,
            "format": row.format,
            "ingestedAt": row.ingested_at.isoformat(),
            "chunks": row.chunks,
        }
        for row in rows
    ]

    return ChatResponse(
        reply=f"Here are your {len(table_rows)} most recent document(s).",
        type="table",
        data=TableData(columns=["filename", "format", "ingestedAt", "chunks"], rows=table_rows),
        suggestions=[Suggestion(label="How many chunks total?", type="text")],
    )
