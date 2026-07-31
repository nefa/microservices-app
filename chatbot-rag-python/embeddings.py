from sentence_transformers import SentenceTransformer

# Loaded once at import time, not per-request - loading this model takes
# real time (downloading/reading weights from disk), so doing it inside
# a request handler would make every single ingest/query call slow. One
# shared instance for the whole process's lifetime, same reasoning as
# TokenService being registered AddSingleton in gateway-nest rather than
# constructed per-request.
_model = SentenceTransformer("all-MiniLM-L6-v2")

EMBEDDING_DIMENSION = _model.get_embedding_dimension()


def embed_text(text: str) -> list[float]:
    # .tolist() converts the model's native numpy array into a plain
    # Python list - psycopg2/pgvector expect a plain list, not a numpy
    # array, when writing to a Vector column.
    return _model.encode(text).tolist()
