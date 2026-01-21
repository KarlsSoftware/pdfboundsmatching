"use client";

/**
 * PDFViewer Component
 *
 * Renders PDF documents using PDF.js library with search match highlighting.
 *
 * Features:
 * - Loads PDFs from URL (local blob or remote)
 * - Renders pages to canvas at container width
 * - Overlays bounding boxes for search matches via BoundsOverlay
 * - Auto-navigates to page containing current match
 * - Page navigation controls (prev/next)
 *
 * The component stores original PDF dimensions to enable accurate
 * coordinate scaling when highlighting matches at different zoom levels.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { BoundingBox, PageDimension } from "../lib/types";
import BoundsOverlay from "./BoundsOverlay";

interface PDFViewerProps {
  pdfUrl: string;
  bounds: BoundingBox[];
  currentMatchIndex: number;
  onPageChange?: (page: number) => void;
}

export default function PDFViewer({
  pdfUrl,
  bounds,
  currentMatchIndex,
  onPageChange,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfDimensions, setPdfDimensions] = useState<PageDimension | null>(
    null
  );
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const doc = await pdfjsLib.getDocument(pdfUrl).promise;

        if (!cancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (!cancelled) {
          setError(
            "Failed to load PDF: " +
              (err instanceof Error ? err.message : String(err))
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        const containerWidth = containerRef.current!.clientWidth || 800;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        setPdfDimensions({
          width: viewport.width,
          height: viewport.height,
        });
        setCanvasSize({
          width: scaledViewport.width,
          height: scaledViewport.height,
        });

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        }).promise;
      } catch (err) {
        console.error("Failed to render page:", err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage]);

  // Track previous match index to detect actual changes
  const prevMatchIndexRef = useRef<number>(-1);

  // Navigate to page and scroll to match when current match changes
  useEffect(() => {
    // Only navigate if the match index actually changed
    if (currentMatchIndex !== prevMatchIndexRef.current) {
      prevMatchIndexRef.current = currentMatchIndex;

      if (bounds.length > 0 && currentMatchIndex >= 0) {
        const currentMatch = bounds[currentMatchIndex];
        if (currentMatch && pdfDimensions && containerRef.current) {
          const targetPage = currentMatch.page + 1;
          setCurrentPage(targetPage);

          // Scroll to the match position after a short delay to allow page render
          setTimeout(() => {
            if (containerRef.current && pdfDimensions) {
              const scaleY = canvasSize.height / pdfDimensions.height;
              const matchY = currentMatch.y0 * scaleY;
              // Scroll so match is roughly in the upper third of the view
              const scrollTarget = Math.max(0, matchY - 100);
              containerRef.current.scrollTo({
                top: scrollTarget,
                behavior: "smooth",
              });
            }
          }, 100);
        }
      }
    }
  }, [currentMatchIndex, bounds, pdfDimensions, canvasSize.height]);

  // Notify parent of page changes
  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="pdf-status">
        <span>Loading PDF...</span>
        <style jsx>{`
          .pdf-status {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius);
            color: var(--color-text-secondary);
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-error">
        <span>{error}</span>
        <style jsx>{`
          .pdf-error {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius);
            color: var(--color-error);
            padding: var(--space-4);
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button
          type="button"
          className="secondary"
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <span className="page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          className="secondary"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>

      <div className="pdf-container" ref={containerRef}>
        <canvas ref={canvasRef} />
        <BoundsOverlay
          bounds={bounds}
          page={currentPage - 1}
          pdfDimensions={pdfDimensions}
          containerWidth={canvasSize.width}
          containerHeight={canvasSize.height}
          currentMatchIndex={currentMatchIndex}
        />
      </div>

      <style jsx>{`
        .pdf-viewer {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          height: 100%;
        }

        .pdf-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2);
          flex-shrink: 0;
        }

        .page-info {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          min-width: 120px;
          text-align: center;
        }

        .pdf-container {
          position: relative;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          overflow: auto;
          background: var(--color-surface);
          flex: 1;
          min-height: 0;
          max-height: calc(100vh - 180px);
        }
      `}</style>
    </div>
  );
}
