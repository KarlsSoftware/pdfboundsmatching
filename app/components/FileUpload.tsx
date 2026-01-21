"use client";

/**
 * FileUpload Component
 *
 * Provides drag-and-drop and click-to-browse PDF upload functionality.
 * Always shows the dropzone for good UX - users can always upload a new file.
 *
 * States:
 * - No file uploaded: Shows dropzone with hint about sample PDF being used
 * - File uploaded: Shows current file info with dropzone to replace
 *
 * Features:
 * - Drag and drop support with visual feedback
 * - File type validation (PDF only)
 * - Loading state during upload
 * - Error handling and display
 */

import { useCallback, useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadResponse } from "../lib/types";

interface FileUploadProps {
  onUpload: (fileId: string, filename: string, pdfUrl: string) => void;
  onClear: () => void;
  currentFile: string | null;
  disabled?: boolean;
}

const API_URL = "http://localhost:8000";

export default function FileUpload({
  onUpload,
  onClear,
  currentFile,
  disabled,
}: FileUploadProps) {
  // Track drag state for visual feedback
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Upload a file to the backend API.
   * Creates a blob URL for local PDF rendering while storing on server.
   */
  const handleUpload = useCallback(
    async (file: File) => {
      // Validate file extension
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please select a PDF file");
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        // Send file as multipart form data
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Upload failed");
        }

        const data: UploadResponse = await response.json();
        // Create local blob URL for PDF.js to render
        const pdfUrl = URL.createObjectURL(file);
        onUpload(data.file_id, data.filename, pdfUrl);
      } catch (err) {
        console.error("Upload failed:", err);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  // Drag event handlers for visual feedback
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setError(null);
    onClear();
  }, [onClear]);

  return (
    <div className="file-upload-wrapper">
      {/* Current file indicator - shown when a file is uploaded */}
      {currentFile && (
        <div className="current-file">
          <div className="file-info">
            {/* PDF icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="filename">{currentFile}</span>
          </div>
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            disabled={disabled}
            title="Remove file"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Dropzone - always visible for good UX */}
      <div
        className={`dropzone ${isDragging ? "dragging" : ""} ${
          isUploading ? "uploading" : ""
        } ${currentFile ? "compact" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        {/* Hidden file input triggered by click */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="visually-hidden"
        />

        {isUploading ? (
          <span className="upload-text">Uploading...</span>
        ) : (
          <>
            {/* Upload icon */}
            <svg
              width={currentFile ? "20" : "24"}
              height={currentFile ? "20" : "24"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="upload-text">
              {currentFile
                ? "Drop new PDF to replace"
                : "Drop your PDF here or click to browse"}
            </span>
          </>
        )}
      </div>

      
      {error && <p className="error-text">{error}</p>}

      <style jsx>{`
        .file-upload-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .current-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2) var(--space-3);
          background: var(--color-surface);
          border: 1px solid var(--color-success);
          border-radius: var(--radius);
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--color-text-primary);
        }

        .file-info svg {
          flex-shrink: 0;
          color: var(--color-success);
        }

        .filename {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        .clear-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-1);
          min-width: 28px;
          min-height: 28px;
          background: transparent;
          border: none;
          border-radius: var(--radius);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: color var(--transition-fast),
            background var(--transition-fast);
        }

        .clear-btn:hover:not(:disabled) {
          color: var(--color-error);
          background: rgba(198, 40, 40, 0.1);
        }

        .clear-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-4);
          border: 2px dashed var(--color-border);
          border-radius: var(--radius);
          background: var(--color-surface);
          cursor: pointer;
          transition: border-color var(--transition-fast),
            background-color var(--transition-fast);
        }

        .dropzone.compact {
          padding: var(--space-3);
          flex-direction: row;
          gap: var(--space-2);
        }

        .dropzone:hover,
        .dropzone.dragging {
          border-color: var(--color-accent);
          background: var(--color-background);
        }

        .dropzone.uploading {
          opacity: 0.7;
          cursor: wait;
        }

        .dropzone svg {
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }

        .upload-text {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          text-align: center;
        }

        .error-text {
          font-size: var(--font-size-sm);
          color: var(--color-error);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
