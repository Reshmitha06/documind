"use client";

import { useCallback, useState } from "react";
import { uploadDocument, type DocInfo } from "@/lib/api";

interface UploadPanelProps {
  onUploaded: (doc: DocInfo) => void;
}

export default function UploadPanel({ onUploaded }: UploadPanelProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const processFile = useCallback(
    async (file: File) => {
      setError("");
      setUploading(true);
      try {
        const doc = await uploadDocument(file);
        onUploaded(doc);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          dragging
            ? "border-emerald-400 bg-emerald-50"
            : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-5 h-5 animate-spin text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Processing document...
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
            <p className="text-sm text-gray-600">
              Drop a <span className="font-medium">PDF</span>,{" "}
              <span className="font-medium">TXT</span>, or{" "}
              <span className="font-medium">MD</span> file
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          </div>
        )}
      </label>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
