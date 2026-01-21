"""
FastAPI application for PDF Text Finder.

This module provides REST API endpoints for:
- Uploading PDF files for text search
- Matching text patterns within PDFs using various strategies
- Retrieving PDF metadata and word extractions

The API uses a strategy pattern for flexible text matching,
supporting exact, fuzzy, regex, and normalized search methods.
"""

import uuid
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from models import MatchRequest, MatchResponse
from strategies import StrategyFactory
from extractor import extract_words, get_page_dimensions

# Initialize FastAPI application with metadata for API documentation
app = FastAPI(
    title="PDF Text Finder API",
    description="API for finding text in PDFs with bounding box coordinates",
    version="1.0.0"
)

# Configure CORS to allow requests from the Next.js frontend
# This is required for the browser to make cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory containing the default sample PDF
PDF_DIR = Path(__file__).parent.parent / "public"
DEFAULT_PDF = "whatisai.pdf"

# Create a temporary directory for storing uploaded PDFs
# Using system temp dir ensures cleanup on system restart
UPLOAD_DIR = Path(tempfile.gettempdir()) / "pdf_text_finder"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory mapping of file IDs to file paths
# Note: In production, this should be replaced with a database
uploaded_files: dict[str, Path] = {}


def get_pdf_path(file_id: str | None = None) -> Path:
    """
    Resolve the PDF file path from a file ID or use the default.

    Args:
        file_id: Optional UUID of an uploaded file

    Returns:
        Path to the PDF file

    Raises:
        HTTPException: If the file is not found
    """
    if file_id:
        # Look up the uploaded file by its ID
        if file_id not in uploaded_files:
            raise HTTPException(status_code=404, detail=f"Uploaded file not found: {file_id}")
        pdf_path = uploaded_files[file_id]
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail=f"PDF file no longer exists: {file_id}")
        return pdf_path

    # Fall back to the default sample PDF
    pdf_path = PDF_DIR / DEFAULT_PDF
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {DEFAULT_PDF}")
    return pdf_path


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file for text searching.

    The file is stored in a temporary directory with a unique ID.
    Use the returned file_id with the /match endpoint to search
    within the uploaded document.

    Args:
        file: The PDF file to upload (multipart form data)

    Returns:
        JSON with file_id, original filename, and success message
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Generate a unique identifier for this upload
    file_id = str(uuid.uuid4())

    # Save the file to the temp directory
    file_path = UPLOAD_DIR / f"{file_id}.pdf"
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Register the file in our mapping
    uploaded_files[file_id] = file_path

    return {
        "file_id": file_id,
        "filename": file.filename,
        "message": "File uploaded successfully"
    }


@app.post("/match", response_model=MatchResponse)
async def match_text(request: MatchRequest):
    """
    Find text matches in a PDF using the specified search strategy.

    This endpoint extracts all words from the PDF, then applies
    the chosen matching strategy to find occurrences of the query.
    Each match includes bounding box coordinates for highlighting.

    Args:
        request: Contains query, strategy, threshold, and optional file_id

    Returns:
        MatchResponse with query, strategy, and list of bounding boxes
    """
    # Get the PDF to search (uploaded or default)
    pdf_path = get_pdf_path(request.file_id)

    # Configure strategy-specific options
    kwargs = {}
    if request.strategy == "fuzzy":
        # Fuzzy matching requires a similarity threshold
        kwargs["threshold"] = request.threshold

    # Create the matching strategy using the factory pattern
    try:
        strategy = StrategyFactory.create(request.strategy, **kwargs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Extract all words with their positions from the PDF
    words = extract_words(str(pdf_path))

    # Apply the strategy to find matching words
    bounds = strategy.find_matches(request.query, words)

    return MatchResponse(
        query=request.query,
        strategy=request.strategy,
        bounds=bounds
    )


@app.get("/strategies")
async def list_strategies():
    """
    List all available text matching strategies with descriptions.

    Returns:
        Dictionary of strategy names and their descriptions
    """
    return {
        "strategies": StrategyFactory.available_strategies(),
        "descriptions": {
            "exact": "Case-sensitive exact match",
            "fuzzy": "Fuzzy matching with configurable threshold",
            "regex": "Regular expression pattern matching",
            "normalized": "Case-insensitive match with whitespace normalization"
        }
    }


@app.get("/extract/{filename}")
async def extract_text(filename: str):
    """
    Extract all words from a PDF file (debugging endpoint).

    Useful for inspecting what text the PDF parser extracts
    and verifying bounding box coordinates.
    """
    pdf_path = get_pdf_path(filename)
    words = extract_words(str(pdf_path))
    return {"filename": filename, "word_count": len(words), "words": words}


@app.get("/dimensions/{filename}")
async def pdf_dimensions(filename: str):
    """
    Get page dimensions for a PDF file.

    Returns width and height for each page, needed for
    scaling bounding boxes to match the rendered PDF.
    """
    pdf_path = get_pdf_path(filename)
    dimensions = get_page_dimensions(str(pdf_path))
    return {"filename": filename, "pages": dimensions}


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}
