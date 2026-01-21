"""Pydantic models for PDF bounds matching API."""

from pydantic import BaseModel


class Word(BaseModel):
    """Represents a word extracted from PDF with bounding box coordinates."""
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    page: int


class MatchRequest(BaseModel):
    """Request payload for matching text in PDF."""
    query: str
    strategy: str = "exact"
    threshold: float = 0.8  # For fuzzy matching
    file_id: str | None = None  # Optional uploaded file ID


class BoundingBox(BaseModel):
    """Bounding box for a matched text region."""
    x0: float
    y0: float
    x1: float
    y1: float
    page: int
    matched_text: str
    confidence: float


class MatchResponse(BaseModel):
    """Response containing all matches found."""
    query: str
    strategy: str
    bounds: list[BoundingBox]
