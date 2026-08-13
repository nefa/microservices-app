# chatbot-rag-python

FastAPI service that owns document ingestion and the `/chat` endpoint —
retrieval-augmented Q&A over documents the user has ingested, plus a
plain-SQL path for questions that are really just "list/count my data"
rather than a similarity search. See
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) (why the system is shaped
this way, including the "Chat responses: semantic answers vs. structured
queries" section this service implements) and
[`../INSTRUCTIONS.md`](../INSTRUCTIONS.md) (running the *whole* stack,
not just this service) for the wider picture — this file is just
chatbot-rag-python's own install/run/endpoints.

`gateway-nest` is the only thing that talks to this service — it
verifies the caller's JWT, then forwards the request here with an
internal shared-secret header and the caller's user id (see "Auth"
below). Nothing here validates a JWT itself.

## Install

Needs Python 3.10+ - check what's actually on `PATH` before creating the
venv (see `../INSTRUCTIONS.md`'s "First-time setup" for why this matters
on this machine specifically):

```bash
python3.12 --version   # or python3.11/python3.10 - whatever's installed
```

```bash
cd chatbot-rag-python
python3.12 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
docker compose up -d
```

`pgvector/pgvector:pg16` ships the `vector` extension but doesn't enable
it automatically - do this once per fresh container/volume, before the
API's first startup:

```bash
docker exec chatbot-postgres psql -U postgres -d chatbotdb -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

The first `pip install` pulls in `torch`/`sentence-transformers` (large
download); the first time the service actually *starts*,
`sentence-transformers` also downloads the `all-MiniLM-L6-v2` embedding
model weights. Both are one-time costs - cached after that.

## Run

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8001
```

Verify:

```bash
curl http://localhost:8001/health
# {"status":"ok"}
```

## Test

```bash
venv/bin/pytest -v
```

Integration-level, not unit or e2e: `test_main.py` drives the real app
object (FastAPI's `TestClient`, in-process ASGI, no `uvicorn` needed)
against the real `chatbot-postgres` database and the real embedding
model - nothing mocked, but it also never leaves the Python process, so
`gateway-nest` (the actual client-facing entry point) isn't involved.
Needs `docker compose up -d` to have been run first, same as running the
app itself. Uses its own `user_id` (`e2e-test-user`, distinct from any
real seeded/demo account) and tears down anything it inserts, so it's
safe to run repeatedly without polluting real data.

## Auth

Every endpoint below except `/health` requires two headers:

| Header | Meaning |
|---|---|
| `X-Internal-Api-Key` | Proves the caller is `gateway-nest`, not a direct hit on this service's port. Must equal `INTERNAL_API_KEY` in `main.py`, which must in turn match `gateway-nest/src/common/internal-api.constants.ts` exactly - hardcoded on both sides for now (`demo-only-internal-service-key-do-not-use-in-production`), not read from an environment variable yet. |
| `X-User-Id` | Who the request is for. Trusted *because* it only ever arrives alongside a valid internal key - this service never verifies a JWT itself, `gateway-nest` already did that before calling here. |

Calling this service directly (`curl`/Postman) means setting both by
hand:

```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: demo-only-internal-service-key-do-not-use-in-production" \
  -H "X-User-Id: 1" \
  -d '{"message": "how many documents do I have?"}'
```

## Endpoints

### `POST /chat`

Routes the message (`chat_router.py`) instead of answering everything
the same way - see `../ARCHITECTURE.md`'s "semantic answers vs.
structured queries" section for why "give me the latest entries" and
"do we have data from CompanyX?" need different answering strategies,
not one strategy for both.

**Routing today:** plain keyword matching (`is_structured_query` -
`"latest"`, `"recent"`, `"list"`, `"how many"`, `"count"`), deliberately
dumb, no NLP/LLM involved. A message containing one of those keywords is
structured; everything else is semantic.

**1. Structured** - plain SQL against `document_chunk`, scoped to the
caller's `user_id`:

```bash
curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: demo-only-internal-service-key-do-not-use-in-production" \
  -H "X-User-Id: 1" -d '{"message": "how many documents do I have?"}'
```
```json
{
  "reply": "You've ingested 2 document(s), 7 chunk(s) total.",
  "type": "text",
  "data": null,
  "suggestions": [{ "label": "List my recent documents", "type": "table" }]
}
```

`"list my recent documents"` instead groups chunks back up to the file
level (most recently ingested first, limit 5) and returns `type: "table"`:

```json
{
  "reply": "Here are your 1 most recent document(s).",
  "type": "table",
  "data": {
    "columns": ["filename", "format", "ingestedAt", "chunks"],
    "rows": [
      { "filename": "acme-notes.pdf", "format": "pdf", "ingestedAt": "2026-08-13T10:00:00+00:00", "chunks": 4 }
    ]
  },
  "suggestions": [{ "label": "How many chunks total?", "type": "text" }]
}
```

**2. Semantic** - embeds the (short) question with the same
`all-MiniLM-L6-v2` model used at ingestion time, then a pgvector cosine
distance (`<=>`) query against `document_chunk.embedding`, top 3,
scoped to the caller's `user_id`:

```bash
curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: demo-only-internal-service-key-do-not-use-in-production" \
  -H "X-User-Id: 1" -d '{"message": "what do we know about acme corp?"}'
```
```json
{
  "reply": "Found 1 relevant excerpt(s).",
  "type": "list",
  "data": { "items": [{ "title": "acme-notes.pdf", "snippet": "Acme Corp signed a new supply contract in March 2026." }] },
  "suggestions": [{ "label": "List my recent documents", "type": "table" }]
}
```

**Retrieval only, no generation.** The semantic path returns the
matching chunks themselves - it does not summarize/synthesize an answer
from them. That's deliberate: committing to an LLM provider
(OpenAI/Anthropic/local) is deferred until something actually needs
generation, not spent on this. See "Where this is headed" below.

### `POST /documents/submit`

Multipart form (`format`: `pdf`|`csv`, `files`: one or more). Stores raw
bytes in `pending_document`, awaiting review - **not** chunked or
embedded yet.

```bash
curl -X POST http://localhost:8001/documents/submit \
  -H "X-Internal-Api-Key: demo-only-internal-service-key-do-not-use-in-production" \
  -H "X-User-Id: 1" -F "format=pdf" -F "files=@notes.pdf"
# {"filesSubmitted":1}
```

### `POST /documents/ingest`

Same multipart shape. Parses (`chunking.py`), embeds each chunk
(`embeddings.py`), and stores rows in `document_chunk` - this is what
`/chat`'s structured and semantic paths both read from.

```bash
curl -X POST http://localhost:8001/documents/ingest \
  -H "X-Internal-Api-Key: demo-only-internal-service-key-do-not-use-in-production" \
  -H "X-User-Id: 1" -F "format=pdf" -F "files=@notes.pdf"
# {"filesIngested":1,"chunksStored":4}
```

Nothing in the current UI flow calls this yet - `frontend-angular`'s
ingestion form calls `/documents/submit` only. Reachable directly for
manual testing until the approval step below exists.

## Where this is headed

**Working today:** the submit/ingest split (upload now, chunk+embed
later), both `/chat` routing paths (structured SQL, semantic
similarity), and a rule-based router deciding between them.

**Deliberately not built yet, not forgotten:**

- **No LLM/generation anywhere.** Both `/chat` paths return real data
  (counts, tables, matched excerpts) but never synthesize a sentence
  from it beyond a templated reply. Picking a provider is real
  architectural surface area (cost, latency, which model, local vs
  hosted) not worth spending until a use case actually needs generated
  text rather than retrieved facts.
- **No approval workflow.** `pending_document` has a `status` column
  (`pending`/`approved`/`rejected`) and reviewer fields, but nothing
  transitions a row from pending to `document_chunk` yet except calling
  `/documents/ingest` directly - there's no endpoint a reviewer UI could
  call to approve a submission and trigger ingestion for it.
- **Routing is deliberately dumb.** Keyword substring matching, not
  intent classification - fine at this scale, expected to need
  replacing (or backing with an LLM function-call/classification step)
  once real usage shows it's too rigid, not before.
- **No similarity threshold.** Semantic search always returns its top 3
  matches regardless of how weak the match is - there's no real corpus
  yet to tune a "not similar enough, say so" cutoff against.
- **Config is hardcoded**, not environment-driven: `INTERNAL_API_KEY`,
  `DATABASE_URL` (`database.py`). Fine for local learning, would need to
  move to env vars/secrets before this went anywhere near production.
- **`chart`/`comparison` response types** from `ARCHITECTURE.md`'s full
  `type` union don't have handlers here (or renderers in
  `frontend-angular`) - `text`/`table`/`list` cover what's actually been
  asked for so far; add the rest when a real use case needs them.
- **`Base.metadata.create_all`**, not a real migration tool (Alembic) -
  fine while the schema is still moving, not once it stabilizes.
