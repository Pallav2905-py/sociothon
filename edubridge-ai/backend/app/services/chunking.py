"""EduBridge AI — Text Chunking Service"""
from typing import List, Dict
from loguru import logger

DEFAULT_CHUNK_SIZE = 500     # characters
DEFAULT_CHUNK_OVERLAP = 100  # characters


def chunk_page_texts(
    page_texts: List[Dict],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Dict]:
    """
    Split page texts into overlapping chunks.
    Each chunk contains: chunk_index, page_number, chunk_text, char_start, char_end
    """
    chunks = []
    chunk_index = 0

    for page_info in page_texts:
        page_num = page_info["page_number"]
        text = page_info["text"].strip()

        if not text:
            continue

        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))

            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence end (।, ., ?, !) within last 100 chars
                for boundary_char in ["।", ".", "?", "!"]:
                    last_boundary = text.rfind(boundary_char, start + chunk_size // 2, end)
                    if last_boundary != -1:
                        end = last_boundary + 1
                        break

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "chunk_index": chunk_index,
                    "page_number": page_num,
                    "chunk_text": chunk_text,
                    "char_start": start,
                    "char_end": end,
                    "token_count": len(chunk_text.split()),
                })
                chunk_index += 1

            # Move forward with overlap
            start = end - chunk_overlap
            if start <= 0 or start >= len(text):
                break

    logger.info(f"Created {len(chunks)} chunks from {len(page_texts)} pages")
    return chunks


def chunk_full_text(
    full_text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Dict]:
    """
    Chunk from a single full-text string (no page metadata).
    """
    return chunk_page_texts(
        [{"page_number": 1, "text": full_text}],
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
