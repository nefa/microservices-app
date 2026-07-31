import io

import pandas as pd
from pypdf import PdfReader

# Character-based sliding window: CHUNK_SIZE characters per chunk, with
# CHUNK_OVERLAP characters repeated at the start of the next chunk. The
# overlap matters - without it, a sentence that happens to fall right on
# a chunk boundary gets split in half, and neither half embeds
# meaningfully on its own. These are reasonable starting values for a
# learning-scale corpus, not tuned against any real dataset.
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def chunk_text(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        # Move forward by (CHUNK_SIZE - CHUNK_OVERLAP), not CHUNK_SIZE,
        # so the next chunk starts CHUNK_OVERLAP characters before this
        # one ends.
        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


def parse_pdf(file_bytes: bytes) -> list[str]:
    reader = PdfReader(io.BytesIO(file_bytes))
    full_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return chunk_text(full_text)


def parse_csv(file_bytes: bytes) -> list[str]:
    df = pd.read_csv(io.BytesIO(file_bytes))

    # One row = one chunk. Unlike PDF text, a CSV row is already a
    # naturally-sized, self-contained unit - splitting it further would
    # break apart related fields (e.g. company name from its date) that
    # need to stay together to mean anything when embedded.
    chunks = []
    for _, row in df.iterrows():
        # "column: value" pairs joined into one line reads naturally to
        # an embedding model - closer to a sentence than a raw CSV row
        # would be, which helps similarity search actually work.
        row_text = ", ".join(f"{column}: {value}" for column, value in row.items())
        chunks.append(row_text)

    return chunks
