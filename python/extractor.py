"""PDF text extraction using pdfplumber."""

import pdfplumber

from models import Word


def extract_words(pdf_path: str) -> list[Word]:
    """Extract words from PDF with bounding box coordinates.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        List of Word objects with text and coordinates
    """
    words = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            # Use tight tolerances to avoid grouping multiple words together
            # x_tolerance: max horizontal gap between chars in same word
            # y_tolerance: max vertical gap between chars in same word
            # split_at_punctuation: break words at punctuation marks
            page_words = page.extract_words(
                x_tolerance=2,
                y_tolerance=2,
                keep_blank_chars=False,
                split_at_punctuation=True,
            )

            for w in page_words:
                words.append(Word(
                    text=w["text"],
                    x0=w["x0"],
                    y0=w["top"],
                    x1=w["x1"],
                    y1=w["bottom"],
                    page=page_num
                ))

    return words


def get_page_dimensions(pdf_path: str) -> list[dict]:
    """Get dimensions for each page in the PDF.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        List of dicts with width and height for each page
    """
    dimensions = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            dimensions.append({
                "width": page.width,
                "height": page.height
            })

    return dimensions
