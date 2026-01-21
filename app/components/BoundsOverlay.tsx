"use client";

/**
 * BoundsOverlay Component
 *
 * Renders search match highlights as a transparent canvas layer over the PDF.
 * Positioned absolutely over the PDF canvas to draw bounding boxes.
 *
 * Visual Design:
 * - Current match: Bright yellow fill with dark border (stands out)
 * - Other matches: Subtle yellow fill with light border (visible but not distracting)
 *
 * Coordinate Scaling:
 * The backend returns bounding boxes in original PDF coordinates.
 * This component scales them to match the rendered PDF size using
 * the ratio of container dimensions to original PDF dimensions.
 */

import { useEffect, useRef } from "react";
import { BoundingBox, PageDimension } from "../lib/types";

interface BoundsOverlayProps {
  bounds: BoundingBox[];
  page: number;
  pdfDimensions: PageDimension | null;
  containerWidth: number;
  containerHeight: number;
  currentMatchIndex: number;
}

export default function BoundsOverlay({
  bounds,
  page,
  pdfDimensions,
  containerWidth,
  containerHeight,
  currentMatchIndex,
}: BoundsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw highlights when bounds, page, or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdfDimensions) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to container
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factors from PDF coords to screen coords
    const scaleX = containerWidth / pdfDimensions.width;
    const scaleY = containerHeight / pdfDimensions.height;

    // Filter to only show matches on current page
    const pageBounds = bounds.filter((b) => b.page === page);

    pageBounds.forEach((bound, index) => {
      const globalIndex = bounds.indexOf(bound);
      const isCurrent = globalIndex === currentMatchIndex;

      const x = bound.x0 * scaleX;
      const y = bound.y0 * scaleY;
      const width = (bound.x1 - bound.x0) * scaleX;
      const height = (bound.y1 - bound.y0) * scaleY;

      if (isCurrent) {
        // Current match: bright yellow with border
        ctx.fillStyle = "rgba(255, 224, 102, 0.5)";
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
      } else {
        // Other matches: subtle yellow, no border
        ctx.fillStyle = "rgba(255, 224, 102, 0.25)";
        ctx.strokeStyle = "rgba(255, 224, 102, 0.5)";
        ctx.lineWidth = 1;
      }

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    });
  }, [bounds, page, pdfDimensions, containerWidth, containerHeight, currentMatchIndex]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    />
  );
}
