import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance
from sentence_transformers import SentenceTransformer

load_dotenv()

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
        client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=384,
                distance=Distance.COSINE
            )
        )
        print("Qdrant connected successfully")
        print(f"Collection created: {COLLECTION_NAME}")

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


def search_vector(query):
    vector = create_embedding(query)

    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=vector,
        limit=5
    )

    return results
