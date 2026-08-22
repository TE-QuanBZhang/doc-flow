"""PDF conversion service using LibreOffice headless.

Features:
- LibreOffice availability detection
- Content-hash-based caching (avoids reconverting unchanged documents)
- 30s timeout for large documents
- Graceful degradation when LibreOffice is not installed
"""

import hashlib
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

CONVERSION_TIMEOUT_SECONDS = 30

_libreoffice_available: Optional[bool] = None
_libreoffice_bin: Optional[str] = None


def is_libreoffice_available() -> bool:
    """Check whether LibreOffice (soffice) is installed and reachable in PATH."""
    global _libreoffice_available, _libreoffice_bin
    if _libreoffice_available is not None:
        return _libreoffice_available

    for candidate in ("soffice", "libreoffice"):
        bin_path = shutil.which(candidate)
        if bin_path:
            _libreoffice_available = True
            _libreoffice_bin = bin_path
            return True

    _libreoffice_available = False
    return False


def _get_libreoffice_bin() -> str:
    """Return the path to the LibreOffice binary, raising if unavailable."""
    if not is_libreoffice_available():
        raise RuntimeError(
            "LibreOffice is not installed or not found in PATH. "
            "Install LibreOffice to enable PDF preview."
        )
    return _libreoffice_bin


def _compute_file_hash(file_path: str) -> str:
    """Compute SHA-256 hash of a file for cache keying."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _get_cache_dir() -> Path:
    """Return the PDF cache directory, creating it if needed."""
    cache_dir = Path.home() / ".doc-flow" / "pdf-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def _get_cached_pdf_path(docx_path: str) -> Path:
    """Compute the cache path for a given docx file based on its content hash."""
    content_hash = _compute_file_hash(docx_path)
    stem = Path(docx_path).stem
    cache_dir = _get_cache_dir()
    return cache_dir / f"{stem}_{content_hash}.pdf"


def convert_to_pdf(docx_path: str, output_dir: Optional[str] = None) -> str:
    """Convert a .docx file to PDF using LibreOffice headless.

    Args:
        docx_path: Path to the source .docx file.
        output_dir: Directory for the output PDF. Defaults to same directory as input.

    Returns:
        Path to the generated PDF file.

    Raises:
        RuntimeError: If conversion fails or LibreOffice is not available.
        FileNotFoundError: If the source document does not exist.
    """
    docx_file = Path(docx_path)
    if not docx_file.exists():
        raise FileNotFoundError(f"Document not found: {docx_path}")

    lo_bin = _get_libreoffice_bin()

    out_dir = output_dir or str(docx_file.parent)
    out_dir_path = Path(out_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)

    try:
        result = subprocess.run(
            [
                lo_bin,
                "--headless",
                "--norestore",
                "--safemode",
                "--convert-to", "pdf",
                "--outdir", str(out_dir_path),
                str(docx_file),
            ],
            capture_output=True,
            text=True,
            timeout=CONVERSION_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"PDF conversion timed out after {CONVERSION_TIMEOUT_SECONDS}s. "
            "The document may be too large for preview."
        )

    if result.returncode != 0:
        raise RuntimeError(f"PDF conversion failed: {result.stderr.strip()}")

    pdf_path = out_dir_path / f"{docx_file.stem}.pdf"
    if not pdf_path.exists():
        pdf_path = out_dir_path / docx_file.with_suffix(".pdf").name

    if not pdf_path.exists():
        raise RuntimeError("PDF conversion produced no output file")

    return str(pdf_path)


def convert_to_pdf_cached(docx_path: str) -> str:
    """Convert a .docx file to PDF with content-hash caching.

    If a cached PDF exists for the same file content, returns it immediately
    without re-running LibreOffice.

    Args:
        docx_path: Path to the source .docx file.

    Returns:
        Path to the PDF file (cached or freshly converted).

    Raises:
        RuntimeError: If LibreOffice is not available or conversion fails.
        FileNotFoundError: If the source document does not exist.
    """
    docx_file = Path(docx_path)
    if not docx_file.exists():
        raise FileNotFoundError(f"Document not found: {docx_path}")

    cached_path = _get_cached_pdf_path(docx_path)
    if cached_path.exists():
        logger.info("PDF cache hit: %s", cached_path.name)
        return str(cached_path)

    logger.info("PDF cache miss, converting: %s", docx_file.name)
    pdf_path = convert_to_pdf(docx_path, output_dir=str(_get_cache_dir()))

    # Rename to cache path if it landed elsewhere
    pdf_path_obj = Path(pdf_path)
    if pdf_path_obj != cached_path:
        shutil.move(str(pdf_path_obj), str(cached_path))

    return str(cached_path)


def clear_pdf_cache() -> int:
    """Remove all cached PDFs. Returns the number of files removed."""
    cache_dir = _get_cache_dir()
    count = 0
    for f in cache_dir.glob("*.pdf"):
        f.unlink()
        count += 1
    return count
