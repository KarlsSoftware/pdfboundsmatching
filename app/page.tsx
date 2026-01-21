"use client";

/**
 * Main page component for PDF Text Finder application.
 *
 * This component orchestrates the entire PDF search workflow:
 * - File upload/selection management
 * - Search execution via the FastAPI backend
 * - Result navigation and display
 * - PDF rendering with match highlighting
 *
 * Layout: Responsive sidebar + PDF viewer design
 * - Desktop: 320px sidebar with controls, flexible PDF viewer
 * - Mobile: Stacked layout with controls above viewer
 */

import { useState, useCallback } from "react";
import PDFViewer from "./components/PDFViewer";
import MatchControls from "./components/MatchControls";
import FileUpload from "./components/FileUpload";
import ResultNavigation from "./components/ResultNavigation";
import { BoundingBox, MatchResponse } from "./lib/types";

// No default PDF - user must upload one

// FastAPI backend URL
const API_URL = "http://localhost:8000";

export default function Home() {
  // ============================================
  // File State
  // Tracks the currently loaded PDF document
  // ============================================
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // ============================================
  // Search State
  // Manages search results and navigation
  // ============================================
  const [bounds, setBounds] = useState<BoundingBox[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle successful file upload from FileUpload component.
   * Updates state with new file info and clears previous search results.
   */
  const handleFileUpload = useCallback(
    (newFileId: string, newFileName: string, newPdfUrl: string) => {
      setFileId(newFileId);
      setFileName(newFileName);
      setPdfUrl(newPdfUrl);
      // Clear previous search results when switching files
      setBounds([]);
      setCurrentMatchIndex(0);
      setError(null);
    },
    []
  );

  /**
   * Reset to default PDF when user clears their upload.
   */
  const handleFileClear = useCallback(() => {
    setFileId(null);
    setFileName(null);
    setPdfUrl(null);
    setBounds([]);
    setCurrentMatchIndex(0);
    setError(null);
  }, []);

  /**
   * Execute search against the FastAPI backend.
   * Sends query, strategy, and threshold to /match endpoint.
   */
  const handleSearch = useCallback(
    async (query: string, strategy: string, threshold: number) => {
      setLoading(true);
      setError(null);

      try {
        // Build request body with optional file_id for uploaded files
        const body: Record<string, unknown> = { query, strategy, threshold };
        if (fileId) {
          body.file_id = fileId;
        }

        const response = await fetch(`${API_URL}/match`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `API error: ${response.statusText}`);
        }

        const data: MatchResponse = await response.json();
        setBounds(data.bounds);
        // Reset to first match when new search is performed
        setCurrentMatchIndex(0);
      } catch (err) {
        console.error("Search failed:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setBounds([]);
      } finally {
        setLoading(false);
      }
    },
    [fileId]
  );

  /**
   * Navigate to a specific match by index.
   * Updates currentMatchIndex which triggers PDFViewer to scroll/navigate.
   */
  const handleNavigate = useCallback((index: number) => {
    setCurrentMatchIndex(index);
  }, []);

  return (
    <div className="app">
      {/* Header with app title */}
      <header className="app-header">
        <h1>PDF Text Finder</h1>
      </header>

      <main className="app-main">
        {/* Sidebar: Controls and results */}
        <aside className="sidebar">
          <div className="sidebar-content">
            {/* Document upload section */}
            <section className="sidebar-section">
              <h2>Document</h2>
              <FileUpload
                onUpload={handleFileUpload}
                onClear={handleFileClear}
                currentFile={fileName}
                disabled={loading}
              />
            </section>

            {/* Search results - shown prominently above search options */}
            {bounds.length > 0 && (
              <section className="sidebar-section results-section">
                <h2>Results</h2>
                <ResultNavigation
                  bounds={bounds}
                  currentIndex={currentMatchIndex}
                  onNavigate={handleNavigate}
                />
              </section>
            )}

            {/* Search controls section */}
            <section className="sidebar-section">
              <h2>Search</h2>
              <MatchControls
                onSearch={handleSearch}
                loading={loading}
                disabled={false}
              />
            </section>

            {/* Error display */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </aside>

        {/* PDF viewer section */}
        <section className="viewer-section">
          {pdfUrl ? (
            <PDFViewer
              pdfUrl={pdfUrl}
              bounds={bounds}
              currentMatchIndex={currentMatchIndex}
            />
          ) : (
            <div className="empty-state">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>Upload a PDF to get started</p>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          padding: var(--space-4) var(--space-5);
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }

        .app-header h1 {
          margin: 0;
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
        }

        .app-main {
          flex: 1;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 0;
        }

        .sidebar {
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          overflow-y: auto;
          max-height: calc(100vh - 73px);
        }

        .sidebar-content {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .sidebar-section h2 {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* Results section - more prominent styling */
        .results-section {
          background: linear-gradient(
            135deg,
            rgba(74, 124, 89, 0.08) 0%,
            rgba(74, 124, 89, 0.04) 100%
          );
          padding: var(--space-3);
          border-radius: var(--radius);
          border: 1px solid rgba(74, 124, 89, 0.2);
        }

        .results-section h2 {
          color: var(--color-success);
        }

        .viewer-section {
          padding: var(--space-4);
          background: var(--color-background);
          overflow: hidden;
          height: calc(100vh - 73px);
          display: flex;
          flex-direction: column;
        }

        .error-message {
          padding: var(--space-3);
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: var(--radius);
          color: var(--color-error);
          font-size: var(--font-size-sm);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 400px;
          color: var(--color-text-secondary);
          gap: var(--space-3);
        }

        .empty-state svg {
          opacity: 0.4;
        }

        .empty-state p {
          margin: 0;
          font-size: var(--font-size-base);
        }

        @media (max-width: 1024px) {
          .app-main {
            grid-template-columns: 280px 1fr;
          }
        }

        @media (max-width: 768px) {
          .app-main {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .sidebar {
            border-right: none;
            border-bottom: 1px solid var(--color-border);
            max-height: none;
            overflow: visible;
          }

          .sidebar-content {
            padding: var(--space-3);
            gap: var(--space-4);
          }

          .viewer-section {
            height: auto;
            min-height: 60vh;
          }
        }
      `}</style>
    </div>
  );
}
