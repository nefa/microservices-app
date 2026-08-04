from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Integer, LargeBinary, String, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# NOTE: hardcoded here for learning purposes, same caveat as every other
# hardcoded config value in this project - a real app would read this
# from an environment variable. This points at chatbot-postgres (see
# docker-compose.yml), NOT the shared "postgres" instance gateway-nest/
# TaskApi use - this service owns its own database.
DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5433/chatbotdb"

# EMBEDDING_DIMENSION must match whatever the embedding model actually
# outputs (all-MiniLM-L6-v2 -> 384). If this doesn't match, inserts fail
# at the database level - pgvector enforces column width like any other
# fixed-size type.
EMBEDDING_DIMENSION = 384

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


# SQLAlchemy's equivalent of TaskApi's TaskEntity / gateway-nest's User
# entity - a plain class mapped to a table via declarative attributes
# instead of decorators.
class DocumentChunk(Base):
    __tablename__ = "document_chunk"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Which uploaded file this chunk came from, and what format it was
    # ingested as - lets "give me the latest entries" queries filter/sort
    # without touching the vector column at all.
    source_filename = Column(String, nullable=False)
    format = Column(String, nullable=False)

    # The forwarded X-User-Id from gateway-nest (see main.py) - who
    # ingested this chunk. Trusted because it only ever arrives paired
    # with the internal API key check.
    user_id = Column(String, nullable=False)

    # The actual chunked text this row represents.
    content = Column(String, nullable=False)

    # The embedding vector for `content`, produced by the sentence-
    # transformers model at ingestion time. This is what similarity
    # search (cosine distance) operates on.
    embedding = Column(Vector(EMBEDDING_DIMENSION), nullable=False)

    ingested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# A document sitting between upload and the chunk/embed pipeline above -
# submitting no longer ingests immediately. `content` holds the raw file
# bytes (LargeBinary -> Postgres bytea) so a reviewer can open/download
# the original later; nothing is chunked or embedded until approval
# moves a row from here into DocumentChunk. Rows are kept after review
# (status flips to approved/rejected) rather than deleted - this table
# doubles as the audit trail for who submitted/reviewed what and when.
class PendingDocument(Base):
    __tablename__ = "pending_document"

    id = Column(Integer, primary_key=True, autoincrement=True)

    source_filename = Column(String, nullable=False)
    format = Column(String, nullable=False)
    content = Column(LargeBinary, nullable=False)

    # The forwarded X-User-Id of whoever submitted this - same trust
    # model as DocumentChunk.user_id above.
    submitted_by = Column(String, nullable=False)

    # 'pending' | 'approved' | 'rejected' - not an enum column on
    # purpose, same reasoning as chatbot-rag-python's response `type`
    # field (see ARCHITECTURE.md): cheap to extend later without a
    # migration, and this is a single-service-owned column, not a
    # cross-language contract that needs stricter enforcement.
    status = Column(String, nullable=False, default="pending")

    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# Base.metadata.create_all(...) is SQLAlchemy's equivalent of TypeORM's
# synchronize: true (see gateway-nest/src/app.module.ts) - creates
# tables from these model classes if they don't already exist, with the
# same tradeoff: fast and convenient for early development, but it's not
# a migration system - no history, no safe way to evolve an existing
# table's shape without manual intervention. A real migration tool
# (Alembic, SQLAlchemy's own) would replace this once the schema
# stabilizes, same as TypeORM migrations would replace synchronize.
def init_db() -> None:
    Base.metadata.create_all(bind=engine)
