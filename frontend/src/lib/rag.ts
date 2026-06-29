// In-memory RAG engine for the Next.js API routes
// Stores documents, chunks, and embeddings in memory

import { GoogleGenAI } from "@google/genai";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 200;

interface DocChunks {
  chunks: string[];
  embeddings: number[][];
}

// In-memory stores
const documents: Map<
  string,
  { id: string; filename: string; chunks: number; uploaded_at: string }
> = new Map();
const stores: Map<string, DocChunks> = new Map();

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenAI({ apiKey: key });
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = start + CHUNK_SIZE;
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function embed(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const result = await client.models.embedContent({
    model: "text-embedding-004",
    contents: texts,
  });
  // result.embeddings is an array of { values: number[] }
  return (result.embeddings ?? []).map(
    (e: { values?: number[] }) => e.values ?? []
  );
}

export async function ingestDocument(
  docId: string,
  filename: string,
  text: string
): Promise<number> {
  if (!text.trim()) throw new Error("No text could be extracted from the file");

  const chunks = chunkText(text);
  const store: DocChunks = { chunks: [], embeddings: [] };

  // Process in batches of 50
  for (let i = 0; i < chunks.length; i += 50) {
    const batch = chunks.slice(i, i + 50);
    const embs = await embed(batch);
    store.chunks.push(...batch);
    store.embeddings.push(...embs);
  }

  stores.set(docId, store);
  const docInfo = {
    id: docId,
    filename,
    chunks: chunks.length,
    uploaded_at: new Date().toISOString(),
  };
  documents.set(docId, docInfo);

  return chunks.length;
}

export async function queryDocument(
  docId: string,
  question: string,
  topK = 5
): Promise<string> {
  const store = stores.get(docId);
  if (!store || store.chunks.length === 0) {
    return "No documents have been ingested yet.";
  }

  const qEmb = (await embed([question]))[0];

  // Find top-k similar chunks
  const similarities = store.embeddings.map((emb, idx) => ({
    idx,
    score: cosineSimilarity(qEmb, emb),
  }));
  similarities.sort((a, b) => b.score - a.score);
  const topChunks = similarities
    .slice(0, Math.min(topK, store.chunks.length))
    .map((s) => store.chunks[s.idx]);

  const context = topChunks.join("\n\n---\n\n");

  const prompt = `You are DocuMind, an intelligent document assistant. Answer the user's question based ONLY on the provided document context. If the answer is not in the context, say "I couldn't find this information in the uploaded document."

Be concise, accurate, and helpful. Use bullet points for lists.

DOCUMENT CONTEXT:
${context}

USER QUESTION: ${question}

ANSWER:`;

  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text ?? "Failed to generate response.";
}

export function deleteDoc(docId: string): boolean {
  stores.delete(docId);
  return documents.delete(docId);
}

export function listDocs() {
  return Array.from(documents.values());
}

export function getDoc(docId: string) {
  return documents.get(docId);
}
