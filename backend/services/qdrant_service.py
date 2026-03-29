import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from sentence_transformers import SentenceTransformer

load_dotenv()
import time

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY
)

model = SentenceTransformer("all-MiniLM-L6-v2")

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
                    size=384,
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
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
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


def create_embedding(text):
    return model.encode(text).tolist()


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