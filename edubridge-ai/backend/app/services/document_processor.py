"""EduBridge AI — Document Processing Service (PyMuPDF + pypdf)"""
import os
import re
from pathlib import Path
from typing import Tuple, Optional
from loguru import logger

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF not available, falling back to pypdf")

try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


def extract_text_from_pdf(file_path: str) -> Tuple[str, int, bool]:
    """
    Extract text from a PDF file.
    Returns: (full_text, page_count, is_scanned)
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    full_text = ""
    page_count = 0
    page_texts = []

    # Try PyMuPDF first
    if PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(str(file_path))
            page_count = len(doc)
            for page_num, page in enumerate(doc):
                text = page.get_text("text")
                page_texts.append((page_num + 1, text))
            doc.close()
            full_text = "\n".join(
                f"[Page {pn}]\n{pt}" for pn, pt in page_texts
            )
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            full_text = ""

    # Fall back to pypdf
    if not full_text.strip() and PYPDF_AVAILABLE:
        try:
            reader = PdfReader(str(file_path))
            page_count = len(reader.pages)
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                page_texts.append((page_num + 1, text))
            full_text = "\n".join(
                f"[Page {pn}]\n{pt}" for pn, pt in page_texts
            )
        except Exception as e:
            logger.error(f"pypdf extraction failed: {e}")
            full_text = ""

    # Detect if PDF is scanned (very little text relative to pages)
    text_chars = len(full_text.strip())
    avg_chars_per_page = text_chars / max(page_count, 1)
    is_scanned = avg_chars_per_page < 50  # Less than 50 chars/page = likely scanned

    logger.info(
        f"Extracted {text_chars} chars from {page_count} pages "
        f"(avg {avg_chars_per_page:.0f}/page, scanned={is_scanned})"
    )

    return full_text, page_count, is_scanned


def get_page_texts(file_path: str) -> list[dict]:
    """
    Returns list of {page_number, text} dicts.
    """
    file_path = Path(file_path)
    pages = []

    if PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(str(file_path))
            for page_num, page in enumerate(doc):
                pages.append({
                    "page_number": page_num + 1,
                    "text": page.get_text("text"),
                })
            doc.close()
            return pages
        except Exception as e:
            logger.error(f"PyMuPDF page extraction failed: {e}")

    if PYPDF_AVAILABLE:
        try:
            reader = PdfReader(str(file_path))
            for page_num, page in enumerate(reader.pages):
                pages.append({
                    "page_number": page_num + 1,
                    "text": page.extract_text() or "",
                })
            return pages
        except Exception as e:
            logger.error(f"pypdf page extraction failed: {e}")

    return pages
