"use client";

/**
 * ResultNavigation Component
 *
 * Displays search results count and provides prev/next navigation.
 * Shows the currently selected match text and its page number.
 *
 * Features:
 * - Previous/Next buttons with circular navigation (wraps around)
 * - Match counter showing "X of Y"
 * - Preview of matched text with highlight styling
 * - Page indicator for multi-page PDFs
 *
 * When a user clicks prev/next, the parent component updates
 * currentMatchIndex which triggers PDFViewer to navigate to that page.
 */

import { BoundingBox } from "../lib/types";

interface ResultNavigationProps {
  bounds: BoundingBox[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function ResultNavigation({
  bounds,
  currentIndex,
  onNavigate,
}: ResultNavigationProps) {
  // Don't render if no results
  if (bounds.length === 0) {
    return null;
  }

  const currentBound = bounds[currentIndex];
  const pageNumber = currentBound ? currentBound.page + 1 : 0;

  // Navigate to previous match (wraps to last if at first)
  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : bounds.length - 1;
    onNavigate(newIndex);
  };

  // Navigate to next match (wraps to first if at last)
  const handleNext = () => {
    const newIndex = currentIndex < bounds.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  };

  return (
    <div className="result-navigation">
      <div className="nav-controls">
        <button
          type="button"
          className="nav-btn secondary icon-button"
          onClick={handlePrevious}
          aria-label="Previous match"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="nav-info">
          <span className="match-count">
            {currentIndex + 1} of {bounds.length}
          </span>
        </div>

        <button
          type="button"
          className="nav-btn secondary icon-button"
          onClick={handleNext}
          aria-label="Next match"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="match-details">
        {currentBound && (
          <>
            <span className="matched-text">"{currentBound.matched_text}"</span>
            <span className="page-indicator">Page {pageNumber}</span>
          </>
        )}
      </div>

      <style jsx>{`
        .result-navigation {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
        }

        .nav-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
        }

        .nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-info {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .match-count {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          min-width: 80px;
          text-align: center;
        }

        .match-details {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        .matched-text {
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
          background: var(--color-highlight-subtle);
          padding: 2px 8px;
          border-radius: 2px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .page-indicator {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
