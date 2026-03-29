import os
import time
import hashlib
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
import numpy as np

try:
    from sentence_transformers import SentenceTransformer  # optional heavy dependency
    _HAS_SENTENCE_TRANSFORMERS = True
except ImportError:  # On Railway we skip installing it to keep image small
    SentenceTransformer = None
    _HAS_SENTENCE_TRANSFORMERS = False

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY
)

# If sentence-transformers is available (e.g., locally), use a real
# transformer model. On lightweight deployments (like Railway free tier)
# we fall back to a simple hashed bag-of-words embedding implemented
# with NumPy so we don't need PyTorch and GPU libraries.
if _HAS_SENTENCE_TRANSFORMERS:
    model = SentenceTransformer("all-MiniLM-L6-v2")
    VECTOR_SIZE = int(getattr(model, "get_sentence_embedding_dimension", lambda: 384)())
else:
    model = None
    VECTOR_SIZE = 384

COLLECTION_NAME = "invoice_vectors"


def init_qdrant():
    print("Connecting to Qdrant...")

    try:
        # Allow opting out of recreating the collection on every startup
        recreate = os.getenv("QDRANT_RECREATE_ON_STARTUP", "true").lower() in ("1", "true", "yes")
        if recreate:
            client.recreate_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE
                )
            )
            print("Qdrant collection recreated:", COLLECTION_NAME)
        else:
            # Ensure collection exists (create if missing)
            try:
                client.get_collection(collection_name=COLLECTION_NAME)
                print("Qdrant collection exists:", COLLECTION_NAME)
            except Exception:
                client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
                )
                print("Qdrant collection created:", COLLECTION_NAME)

        print("Qdrant connected successfully")

    except Exception as e:
        print("Qdrant connection failed")
        print("Error:", e)


# def init_qdrant():
#     client.recreate_collection(
#         collection_name=COLLECTION_NAME,
#         vectors_config=VectorParams(
#             size=384,
#             distance=Distance.COSINE
#         )
#     )
def _simple_hashed_embedding(text: str) -> list:
    """Lightweight bag-of-words style embedding using hashing.

    This avoids pulling in heavy ML libraries. It is not as
    semantically powerful as transformer embeddings but is
    sufficient for basic similarity search while keeping
    the container size small.
    """
    vec = np.zeros(VECTOR_SIZE, dtype=np.float32)
    if not text:
        return vec.tolist()

    tokens = str(text).lower().split()
    for tok in tokens:
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
        # Spread hash across a few positions to reduce collisions
        for i in range(4):
            idx = (h >> (i * 8)) % VECTOR_SIZE
            vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec.tolist()


def create_embedding(text):
    if model is not None:
        return model.encode(text).tolist()
    return _simple_hashed_embedding(text)


def store_vector(id, text, payload):
    vector = create_embedding(text)

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            {
                "id": id,
                "vector": vector,
                "payload": payload
            }
        ]
    )


EMBED_BATCH_SIZE = int(os.getenv("QDRANT_EMBED_BATCH_SIZE", "64"))
UPSERT_BATCH_SIZE = int(os.getenv("QDRANT_UPSERT_BATCH_SIZE", "1000"))


def create_embeddings(texts, batch_size: int = None):
    """Encode a list of texts using the sentence transformer model in batches.

    Returns a list of vectors (lists of floats).
    """
    if not texts:
        return []

    # Use the transformer model if available, otherwise fall back
    # to the lightweight hashed embedding.
    if model is not None:
        bs = batch_size or EMBED_BATCH_SIZE
        start = time.time()
        vectors = model.encode(
            texts,
            batch_size=bs,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        duration = time.time() - start
        print(f"Encoded {len(texts)} texts in {duration:.2f}s (batch_size={bs})")
        return vectors.tolist()

    # Fallback: simple hashed embeddings per text
    start = time.time()
    vectors = [_simple_hashed_embedding(t) for t in texts]
    duration = time.time() - start
    print(f"Encoded {len(texts)} texts with fallback embeddings in {duration:.2f}s")
    return vectors


def upsert_points(points, batch_size: int = None):
    """Upsert points into Qdrant in chunks to reduce per-request overhead.

    `points` should be a list of dicts with keys: `id`, `vector`, `payload`.
    """
    if not points:
        return
    bs = batch_size or UPSERT_BATCH_SIZE
    total = len(points)
    print(f"Upserting {total} points to Qdrant in batches of {bs}")
    for i in range(0, total, bs):
        chunk = points[i:i+bs]
        start = time.time()
        client.upsert(collection_name=COLLECTION_NAME, points=chunk)
        dur = time.time() - start
        print(f"Upserted chunk {i // bs + 1} ({len(chunk)} pts) in {dur:.2f}s")


def search_vector(query):
    vector = create_embedding(query)

    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=vector,
        limit=5
    )

    return results