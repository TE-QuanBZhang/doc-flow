"""Image and embedded-object replacement preserving geometric properties.

Replaces image binary content and OLE embedded object data in .docx while
preserving all geometric properties (extent/anchor for images, container
nodes for OLE objects).
"""

import io
import shutil
from pathlib import Path
from typing import Any, Optional

from docx import Document as DocxDocument
from docx.oxml.ns import qn
from lxml import etree

REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'


class ImageReplacementError(Exception):
    """Raised when image/object replacement fails."""


def replace_images_preserving_geometry(
    template_path: str,
    output_path: str,
    image_map: dict[str, bytes | str],
) -> str:
    """Replace images by placeholder name, preserving extent/anchor geometry.

    Args:
        template_path: Source .docx.
        output_path: Output .docx.
        image_map: Mapping of placeholder key -> image bytes or file path.
            Placeholder keys are detected from the alt-text (docPr name/descr)
            of each image in the document.

    Returns:
        Output path.
    """
    shutil.copy2(template_path, output_path)
    doc = DocxDocument(output_path)

    # Collect all image references across body, headers, footers
    replaced = 0
    for part_name, part in _iter_all_parts(doc):
        for blip in part.element.iter():
            if etree.QName(blip).localname != 'blip':
                continue
            key = _blip_alt_text_key(blip)
            if key is None or key not in image_map:
                continue

            r_embed = blip.get(f'{{{REL_NS}}}embed')
            if not r_embed:
                continue
            rel = part.rels.get(r_embed)
            if rel is None or rel.target_part is None:
                continue

            new_bytes = _resolve_image_bytes(image_map[key])
            new_bytes = _convert_to_content_type(new_bytes, rel.target_part.content_type)
            rel.target_part._blob = new_bytes
            replaced += 1

    if replaced == 0:
        raise ImageReplacementError("未找到匹配的图片占位符")

    # Save image changes back to the document
    doc.save(output_path)

    return output_path


def replace_embedded_objects(
    template_path: str,
    output_path: str,
    object_map: dict[str, bytes | str],
) -> str:
    """Replace embedded OLE object data (e.g., chart xlsx) by placeholder key.

    Placeholder keys are matched against the OLE object's alt-text (shape name).
    """
    shutil.copy2(template_path, output_path)
    doc = DocxDocument(output_path)

    replaced = 0
    for part_name, part in _iter_all_parts(doc):
        for ole in part.element.iter():
            local = etree.QName(ole).localname
            if local not in ('OLEObject', 'object'):
                continue

            # Find associated shape name (docPr name) as the placeholder key
            key = _find_ole_key(ole)
            if key is None or key not in object_map:
                continue

            r_id = ole.get(f'{{{REL_NS}}}id')
            if not r_id:
                continue
            rel = part.rels.get(r_id)
            if rel is None or rel.target_part is None:
                continue

            new_bytes = _resolve_image_bytes(object_map[key])
            rel.target_part._blob = new_bytes
            replaced += 1

    if replaced == 0:
        raise ImageReplacementError("未找到匹配的嵌入对象占位符")

    # Save object changes back to the document
    doc.save(output_path)

    return output_path


# ─── Helpers ─────────────────────────────────────────────────

def _iter_all_parts(doc: DocxDocument):
    """Yield (name, part) for the main document and all header/footer parts."""
    seen = set()
    main_part = doc.part
    yield 'document', main_part
    seen.add(id(main_part))

    # Iterate sections for header/footer parts
    for section in doc.sections:
        for hf in (section.header, section.footer, section.even_page_header,
                   section.even_page_footer, section.first_page_header,
                   section.first_page_footer):
            if hf is None:
                continue
            try:
                p = hf.part
            except Exception:
                continue
            if id(p) not in seen:
                seen.add(id(p))
                yield 'headerfooter', p


def _blip_alt_text_key(blip) -> Optional[str]:
    """Extract placeholder key from the image's docPr (sibling of inline/anchor)."""
    node = blip.getparent()
    while node is not None:
        local = etree.QName(node).localname
        # docPr sits inside wp:inline / wp:anchor as a child
        if local in ('inline', 'anchor'):
            for child in node:
                if etree.QName(child).localname == 'docPr':
                    name = child.get('name', '')
                    descr = child.get('descr', '')
                    for candidate in (name, descr):
                        if candidate and ('{{' in candidate or candidate.isidentifier()):
                            return candidate.strip('{}')
        node = node.getparent()
    return None


def _find_ole_key(ole) -> Optional[str]:
    """Find a placeholder key near an OLE object (docPr name / shape name)."""
    node = ole
    while node is not None:
        if etree.QName(node).localname == 'docPr':
            name = node.get('name', '')
            if name:
                return name.strip('{}')
        node = node.getparent()
    return None


def _resolve_image_bytes(value: bytes | str) -> bytes:
    """Resolve an image value to bytes (either raw bytes or a file path)."""
    if isinstance(value, bytes):
        return value
    p = Path(value)
    if not p.exists():
        raise ImageReplacementError(f"图片文件不存在: {value}")
    return p.read_bytes()


def _convert_to_content_type(data: bytes, content_type: str) -> bytes:
    """Convert image bytes to the target content type (PNG/JPG) if needed."""
    if not content_type:
        return data
    fmt = content_type.split('/')[-1].lower()
    if fmt not in ('png', 'jpeg', 'jpg', 'gif', 'bmp'):
        return data

    # Detect current format
    current = _detect_image_format(data)
    if current == fmt or fmt == 'jpeg' and current == 'jpg':
        return data

    try:
        from PIL import Image as PILImage
        img = PILImage.open(io.BytesIO(data))
        out = io.BytesIO()
        pil_fmt = 'JPEG' if fmt == 'jpeg' else fmt.upper()
        img.save(out, pil_fmt)
        return out.getvalue()
    except Exception:
        return data


def _detect_image_format(data: bytes) -> str:
    """Detect image format from magic bytes."""
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if data[:2] == b'\xff\xd8':
        return 'jpeg'
    if data[:6] in (b'GIF87a', b'GIF89a'):
        return 'gif'
    if data[:2] == b'BM':
        return 'bmp'
    return ''
