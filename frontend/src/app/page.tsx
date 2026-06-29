"use client";

import { useState, useCallback, useEffect } from "react";
import UploadPanel from "@/components/UploadPanel";
import DocList from "@/components/DocList";
import ChatPanel from "@/components/ChatPanel";
import { checkHealth, type DocInfo, type HealthStatus } from "@/lib/api";

export default function Home() {
  const [documents, setDocuments] = useState<DocInfo[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch(() => setBackendDown(true));
  }, []);

  const handleUploaded = useCallback((doc: DocInfo) => {
    setDocuments((prev) => [...prev, doc]);
    setActiveDocId(doc.id);
  }, []);

  const handleDeleted = useCallback(
    (docId: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (activeDocId === docId) setActiveDocId(null);
    },
    [activeDocId]
  );

  const activeDoc = documents.find((d) => d.id === activeDocId);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">DocuMind</h1>
              <p className="text-xs text-gray-500">
                AI-powered document Q&amp;A with RAG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backendDown ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                Backend offline
              </span>
            ) : health && !health.api_key_configured ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                API key needed
              </span>
            ) : health ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                Ready
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Backend warning */}
      {backendDown && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-3 text-sm text-red-700 shrink-0">
          Backend is not running. Start it with:{" "}
          <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs">
            cd backend &amp;&amp; py -m uvicorn main:app --reload
          </code>
        </div>
      )}

      {health && !health.api_key_configured && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 text-sm text-amber-700 shrink-0">
          Get a free API key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            aistudio.google.com/apikey
          </a>{" "}
          and add it to <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">backend/.env</code>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <UploadPanel onUploaded={handleUploaded} />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <DocList
              documents={documents}
              activeDocId={activeDocId}
              onSelect={setActiveDocId}
              onDeleted={handleDeleted}
            />
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-h-0 bg-white">
          <ChatPanel
            docId={activeDocId}
            docName={activeDoc?.filename || ""}
          />
        </main>
      </div>
    </div>
  );
}
