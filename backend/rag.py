import os
from typing import List

import numpy as np
from google import genai
from PyPDF2 import PdfReader


CHUNK_SIZE = 800
CHUNK_OVERLAP = 200


def _chunk_text(text: str) -> List[str]:
    """Split text into overlapping chunks."""
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def extract_text_from_pdf(path: str) -> str:
    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            pages.append(t)
    return "\n".join(pages)


def extract_text_from_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


class VectorStore:
    """Simple in-memory vector store using numpy cosine similarity."""

    def __init__(self):
        self.chunks: List[str] = []
        self.embeddings: np.ndarray | None = None

    def add(self, chunks: List[str], embeddings: List[List[float]]):
        self.chunks.extend(chunks)
        new_emb = np.array(embeddings, dtype=np.float32)
        if self.embeddings is None:
            self.embeddings = new_emb
        else:
            self.embeddings = np.vstack([self.embeddings, new_emb])

    def search(self, query_embedding: List[float], top_k: int = 5) -> List[str]:
        if self.embeddings is None or len(self.chunks) == 0:
            return []

        q = np.array(query_embedding, dtype=np.float32)
        # Cosine similarity
        norms = np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(q)
        norms = np.where(norms == 0, 1, norms)
        similarities = self.embeddings @ q / norms

        k = min(top_k, len(self.chunks))
        top_indices = np.argsort(similarities)[-k:][::-1]
        return [self.chunks[i] for i in top_indices]

    @property
    def count(self) -> int:
        return len(self.chunks)


class RAGEngine:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.stores: dict[str, VectorStore] = {}

    def _get_store(self, doc_id: str) -> VectorStore:
        if doc_id not in self.stores:
            self.stores[doc_id] = VectorStore()
        return self.stores[doc_id]

    def _embed(self, texts: List[str]) -> List[List[float]]:
        result = self.client.models.embed_content(
            model="text-embedding-004",
            contents=texts,
        )
        return [e.values for e in result.embeddings]

    def ingest(self, doc_id: str, file_path: str, filename: str) -> int:
        """Parse file, chunk, embed, and store. Returns chunk count."""
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            text = extract_text_from_pdf(file_path)
        elif ext in (".txt", ".md"):
            text = extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        if not text.strip():
            raise ValueError("No text could be extracted from the file.")

        chunks = _chunk_text(text)
        store = self._get_store(doc_id)

        # Process in batches of 50
        batch_size = 50
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            embeddings = self._embed(batch)
            store.add(batch, embeddings)

        return len(chunks)

    def query(self, doc_id: str, question: str, top_k: int = 5) -> str:
        """Retrieve relevant chunks and generate answer with Gemini."""
        store = self._get_store(doc_id)

        if store.count == 0:
            return "No documents have been ingested yet."

        q_embedding = self._embed([question])[0]
        context_chunks = store.search(q_embedding, top_k=top_k)
        context = "\n\n---\n\n".join(context_chunks)

        prompt = f"""You are DocuMind, an intelligent document assistant. Answer the user's question based ONLY on the provided document context. If the answer is not in the context, say "I couldn't find this information in the uploaded document."

Be concise, accurate, and helpful. Use bullet points for lists.

DOCUMENT CONTEXT:
{context}

USER QUESTION: {question}

ANSWER:"""

        response = self.client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text

    def delete_document(self, doc_id: str):
        if doc_id in self.stores:
            del self.stores[doc_id]
