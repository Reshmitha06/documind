import os
import uuid
import shutil
from datetime import datetime

import truststore
truststore.inject_into_ssl()

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import RAGEngine

load_dotenv(override=True)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

api_key = os.getenv("GEMINI_API_KEY", "")
if not api_key or api_key == "your_gemini_api_key_here":
    print("⚠  WARNING: GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/apikey")
    print("   Then paste it in backend/.env")

app = FastAPI(title="DocuMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document registry
documents: dict[str, dict] = {}
rag_engine: RAGEngine | None = None


def get_rag() -> RAGEngine:
    global rag_engine
    if rag_engine is None:
        key = os.getenv("GEMINI_API_KEY", "")
        if not key or key == "your_gemini_api_key_here":
            raise HTTPException(
                status_code=503,
                detail="GEMINI_API_KEY not configured. Get a free key at https://aistudio.google.com/apikey and add it to backend/.env",
            )
        rag_engine = RAGEngine(api_key=key)
    return rag_engine


class AskRequest(BaseModel):
    doc_id: str
    question: str


class AskResponse(BaseModel):
    answer: str
    doc_id: str


class DocInfo(BaseModel):
    id: str
    filename: str
    chunks: int
    uploaded_at: str


@app.get("/health")
def health():
    has_key = bool(os.getenv("GEMINI_API_KEY", "")) and os.getenv("GEMINI_API_KEY") != "your_gemini_api_key_here"
    return {"status": "ok", "api_key_configured": has_key}


@app.post("/upload", response_model=DocInfo)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".txt", ".md"):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, and MD files are supported")

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}{ext}")

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        engine = get_rag()
        chunk_count = engine.ingest(doc_id, file_path, file.filename)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

    doc_info = {
        "id": doc_id,
        "filename": file.filename,
        "chunks": chunk_count,
        "uploaded_at": datetime.now().isoformat(),
        "file_path": file_path,
    }
    documents[doc_id] = doc_info

    return DocInfo(**doc_info)


@app.get("/documents", response_model=list[DocInfo])
def list_documents():
    return [DocInfo(**{k: v for k, v in d.items() if k != "file_path"}) for d in documents.values()]


@app.post("/ask", response_model=AskResponse)
async def ask_question(req: AskRequest):
    if req.doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    engine = get_rag()
    answer = engine.query(req.doc_id, req.question)

    return AskResponse(answer=answer, doc_id=req.doc_id)


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = documents.pop(doc_id)
    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)

    try:
        engine = get_rag()
        engine.delete_document(doc_id)
    except Exception:
        pass

    return {"status": "deleted", "doc_id": doc_id}
