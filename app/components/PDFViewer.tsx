"use client";

/**
 * PDFViewer Component
 *
 * Renders PDF documents using PDF.js with continuous scroll and search highlighting.
 *
 * UX Design:
 * - All pages render vertically for natural scrolling (like a real PDF reader)
 * - Page indicator updates as user scrolls
 * - Search matches auto-scroll into view
 * - Previous/Next buttons for quick page jumps
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { BoundingBox, PageDimension } from "../lib/types";
import BoundsOverlay from "./BoundsOverlay";

interface PDFViewerProps {
  pdfUrl: string;
  bounds: BoundingBox[];
  currentMatchIndex: number;
}

interface PageData {
  pageNum: number;
  dimensions: PageDimension;
  rendered: boolean;
}

export default function PDFViewer({
  pdfUrl,
  bounds,
  currentMatchIndex,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
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

          // Get dimensions for all pages
          const pageDataList: PageData[] = [];
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1 });
            pageDataList.push({
              pageNum: i,
              dimensions: { width: viewport.width, height: viewport.height },
              rendered: false,
            });
          }
          setPages(pageDataList);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        if (!cancelled) {
          setError("Failed to load PDF: " + (err instanceof Error ? err.message : String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Track container width for scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = container.clientWidth;
      if (width > 0) setContainerWidth(width);
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  // Render all pages when PDF loads or container resizes
  useEffect(() => {
    if (!pdfDoc || !containerWidth || pages.length === 0) return;

    // Small delay to ensure canvas elements are mounted
    const timer = setTimeout(async () => {
      for (const pageData of pages) {
        const canvas = canvasRefs.current.get(pageData.pageNum);
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(pageData.pageNum);
          const ctx = canvas.getContext("2d")!;

          const scale = containerWidth / pageData.dimensions.width;
          const scaledViewport = page.getViewport({ scale });

          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          await page.render({
            canvasContext: ctx,
            viewport: scaledViewport,
          }).promise;
        } catch (err) {
          console.error(`Failed to render page ${pageData.pageNum}:`, err);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [pdfDoc, containerWidth, pages]);

  // Track current page based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollCenter = scrollTop + containerHeight / 3; // Upper third of view

      // Find which page is most visible
      for (const [pageNum, pageEl] of pageRefs.current) {
        const rect = pageEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + scrollTop;
        const relativeBottom = relativeTop + rect.height;

        if (scrollCenter >= relativeTop && scrollCenter < relativeBottom) {
          setCurrentPage(pageNum);
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [pages]);

  // Scroll to match when currentMatchIndex changes
  const prevMatchIndexRef = useRef<number>(-1);
  const prevBoundsLengthRef = useRef<number>(0);

  useEffect(() => {
    // Don't scroll while loading or if no bounds
    if (loading || bounds.length === 0 || currentMatchIndex < 0) return;

    // Reset ref when new search (bounds changed)
    if (bounds.length !== prevBoundsLengthRef.current) {
      prevBoundsLengthRef.current = bounds.length;
      prevMatchIndexRef.current = -1;
    }

    if (currentMatchIndex === prevMatchIndexRef.current) return;
    prevMatchIndexRef.current = currentMatchIndex;

    const match = bounds[currentMatchIndex];
    if (!match) return;

    const targetPage = match.page + 1;
    const pageData = pages.find(p => p.pageNum === targetPage);
    if (!pageData || !containerRef.current) return;

    // Wait for render to complete, then scroll
    setTimeout(() => {
      const pageEl = pageRefs.current.get(targetPage);
      const container = containerRef.current;
      if (!pageEl || !container) return;

      // Calculate position within the page
      const scale = containerWidth / pageData.dimensions.width;
      const matchY = match.y0 * scale;

      // Get page position relative to container
      const pageRect = pageEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const pageTop = pageRect.top - containerRect.top + container.scrollTop;

      container.scrollTo({
        top: pageTop + matchY - 100,
        behavior: "smooth",
      });
    }, 150);
  }, [currentMatchIndex, bounds, pages, containerWidth, loading]);

  // Quick navigation
  const scrollToPage = useCallback((pageNum: number) => {
    const pageEl = pageRefs.current.get(pageNum);
    if (pageEl && containerRef.current) {
      const container = containerRef.current;
      const pageRect = pageEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const pageTop = pageRect.top - containerRect.top + container.scrollTop;

      container.scrollTo({
        top: pageTop,
        behavior: "smooth",
      });
    }
  }, []);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
  }, [currentPage, scrollToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) scrollToPage(currentPage + 1);
  }, [currentPage, totalPages, scrollToPage]);

  // Calculate scaled dimensions for a page
  const getScaledHeight = (pageData: PageData) => {
    if (!containerWidth) return 0;
    const scale = containerWidth / pageData.dimensions.width;
    return pageData.dimensions.height * scale;
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button
          type="button"
          className="secondary"
          onClick={goToPrevPage}
          disabled={loading || currentPage <= 1}
        >
          ↑ Prev
        </button>
        <span className="page-info">
          {loading ? "Loading..." : `Page ${currentPage} of ${totalPages}`}
        </span>
        <button
          type="button"
          className="secondary"
          onClick={goToNextPage}
          disabled={loading || currentPage >= totalPages}
        >
          Next ↓
        </button>
      </div>

      <div className="pdf-container" ref={containerRef}>
        {error && (
          <div className="pdf-message error">{error}</div>
        )}
        {loading && !error && (
          <div className="pdf-message">Loading PDF...</div>
        )}
        {!loading && !error && pages.map((pageData) => (
          <div
            key={pageData.pageNum}
            ref={(el) => {
              if (el) pageRefs.current.set(pageData.pageNum, el);
            }}
            className="pdf-page"
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(pageData.pageNum, el);
              }}
            />
            <BoundsOverlay
              bounds={bounds}
              page={pageData.pageNum - 1}
              pdfDimensions={pageData.dimensions}
              containerWidth={containerWidth}
              containerHeight={getScaledHeight(pageData)}
              currentMatchIndex={currentMatchIndex}
            />
          </div>
        ))}
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
          background: var(--color-surface);
          border-radius: var(--radius);
        }

        .page-info {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          min-width: 120px;
          text-align: center;
        }

        .pdf-container {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--color-surface);
        }

        .pdf-message {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          color: var(--color-text-secondary);
        }

        .pdf-message.error {
          color: var(--color-error);
        }

        .pdf-page {
          position: relative;
          line-height: 0;
        }

        .pdf-page canvas {
          display: block;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
