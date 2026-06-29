const API_BASE = "/api";

export interface DocInfo {
  id: string;
  filename: string;
  chunks: number;
  uploaded_at: string;
}

export interface AskResponse {
  answer: string;
  doc_id: string;
}

export interface HealthStatus {
  status: string;
  api_key_configured: boolean;
}

export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend not reachable");
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function listDocuments(): Promise<DocInfo[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function askQuestion(
  docId: string,
  question: string
): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc_id: docId, question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Query failed" }));
    throw new Error(err.detail || "Query failed");
  }

  return res.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}
