"""Convert office documents to Markdown via anydoc (firecrawl-anydoc).

anydoc is a local Rust-based converter: no external service, single-digit
millisecond conversions. Markdown files pass through unchanged.
"""
import os

_MARKDOWN_EXTS = {".md", ".markdown"}


def convert_to_markdown(content: bytes, filename: str) -> str:
    """Convert file bytes to Markdown; markdown files pass through unchanged.

    Raises anydoc.ConvertError subclasses (Unsupported/Encrypted/Malformed)
    when no meaningful Markdown can be produced.
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext in _MARKDOWN_EXTS:
        return content.decode("utf-8", errors="replace")

    import anydoc  # local import: heavy native module, load only when needed

    # CSV has no content signature; anydoc needs the explicit format name.
    if ext == ".csv":
        return anydoc.to_markdown_bytes(content, "csv")
    return anydoc.to_markdown_bytes(content)
