"use client";

import type { DocInfo } from "@/lib/api";
import { deleteDocument } from "@/lib/api";

interface DocListProps {
  documents: DocInfo[];
  activeDocId: string | null;
  onSelect: (docId: string) => void;
  onDeleted: (docId: string) => void;
}

export default function DocList({
  documents,
  activeDocId,
  onSelect,
  onDeleted,
}: DocListProps) {
  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      onDeleted(docId);
    } catch {
      // silently fail
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="w-10 h-10 mx-auto text-gray-300 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-sm text-gray-400">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
        Documents ({documents.length})
      </p>
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 group transition-colors ${
            activeDocId === doc.id
              ? "bg-emerald-50 border border-emerald-200"
              : "hover:bg-gray-50 border border-transparent"
          }`}
        >
          <svg
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              activeDocId === doc.id ? "text-emerald-500" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {doc.filename}
            </p>
            <p className="text-xs text-gray-400">{doc.chunks} chunks</p>
          </div>
          <button
            onClick={(e) => handleDelete(e, doc.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
            aria-label="Delete document"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </button>
      ))}
    </div>
  );
}
