/**
 * TypeScript interfaces mirroring Python Pydantic models.
 * These must stay in sync with python/models.py
 */

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  page: number;
  matched_text: string;
  confidence: number;
}

export interface MatchRequest {
  query: string;
  strategy: string;
  threshold?: number;
  file_id?: string;
}

export interface MatchResponse {
  query: string;
  strategy: string;
  bounds: BoundingBox[];
}

export interface StrategiesResponse {
  strategies: string[];
  descriptions: Record<string, string>;
}

export interface PageDimension {
  width: number;
  height: number;
}

export interface DimensionsResponse {
  filename: string;
  pages: PageDimension[];
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  message: string;
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  example?: string;
  hasThreshold?: boolean;
}

export const STRATEGIES: StrategyInfo[] = [
  {
    id: "exact",
    name: "Exact Match",
    description: "Find exact words with matching capitalization",
    bestFor: "Precise word matches (recommended)",
  },
  {
    id: "fuzzy",
    name: "Flexible Search",
    description: "Find similar words even with typos or misspellings",
    bestFor: "Uncertain spelling",
    hasThreshold: true,
  },
  {
    id: "regex",
    name: "Pattern Search",
    description: "Use special codes to find formatted text like phone numbers, dates, or IDs",
    bestFor: "Structured data (advanced)",
    example: "\\d{4} finds any 4-digit number like 2024",
  },
  {
    id: "contains",
    name: "Contains",
    description: "Find words containing your search text (case-insensitive)",
    bestFor: "Partial word matches",
    example: "'no' matches 'not', 'know', 'another'",
  },
];
