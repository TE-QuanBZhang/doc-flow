"""High-fidelity OOXML to HTML renderer using Mammoth engine.

Uses Mammoth for robust body content conversion (headings, tables, lists, 
formatting), augmented with header/footer extraction and CSS stylesheet.
"""

import base64
import io
from pathlib import Path

from docx import Document as DocxDocument
from docx.oxml.ns import qn
from lxml import etree

import mammoth


def render_to_html(file_path: str) -> str:
    """Convert a .docx document to HTML with high-fidelity formatting.
    
    Uses Mammoth for body content, plus custom header/footer and CSS.
    """
    doc = DocxDocument(file_path)
    css = _build_css(doc)

    # Convert body via Mammoth (handles images as base64 data URIs automatically)
    with open(file_path, 'rb') as f:
        result = mammoth.convert_to_html(f, style_map=_get_style_map())
        body_html = result.value

    # Build preview with CSS + header/footer + body
    parts = [f'<style>{css}</style>', '<div class="doc-preview">']

    # Headers
    for section in doc.sections:
        h_html = _render_hf(section, "header")
        if h_html:
            parts.append(h_html)

    # Content
    parts.append(body_html)

    # Footers
    for section in doc.sections:
        f_html = _render_hf(section, "footer")
        if f_html:
            parts.append(f_html)

    parts.append('</div>')
    return '\n'.join(parts)


def _get_style_map() -> str:
    """Mammoth style mapping to convert Word styles to semantic HTML + classes."""
    return """
    p[style-name='Title'] => h1.title:fresh
    p[style-name='Subtitle'] => h2.subtitle:fresh
    p[style-name='Heading 1'] => h1:fresh
    p[style-name='Heading 2'] => h2:fresh
    p[style-name='Heading 3'] => h3:fresh
    p[style-name='Heading 4'] => h4:fresh
    p[style-name='Heading 5'] => h5:fresh
    p[style-name='Heading 6'] => h6:fresh
    p[style-name='List Paragraph'] => li:fresh
    p[style-name='List Bullet'] => ul > li:fresh
    p[style-name='List Number'] => ol > li:fresh
    r[style-name='Strong'] => strong
    r[style-name='Emphasis'] => em
    """


def _build_css(doc: DocxDocument) -> str:
    """Build CSS stylesheet from document styles and layout."""
    rules = []

    # Page setup
    try:
        section = doc.sections[0]
        mt = _emu_to_cm(section.top_margin) if section.top_margin else 2.54
        mb = _emu_to_cm(section.bottom_margin) if section.bottom_margin else 2.54
        ml = _emu_to_cm(section.left_margin) if section.left_margin else 3.17
        mr = _emu_to_cm(section.right_margin) if section.right_margin else 3.17
        rules.append(
            f'.doc-preview {{ '
            f'padding: {mt:.2f}cm {mr:.2f}cm {mb:.2f}cm {ml:.2f}cm; '
            f'background: #ffffff; font-size: 12pt; line-height: 1.15; '
            f'color: #000000; max-width: 100%; font-family: serif; '
            f'}}'
        )
    except Exception:
        rules.append('.doc-preview { padding: 2.54cm 3.17cm; background: #fff; font-family: serif; }')

    # Header/Footer
    rules.append('.doc-preview .hf { font-size: 10pt; color: #666; }')
    rules.append('.doc-preview .hf-header { border-bottom: 1px solid #ccc; padding-bottom: 6pt; margin-bottom: 12pt; }')
    rules.append('.doc-preview .hf-footer { border-top: 1px solid #ccc; padding-top: 6pt; margin-top: 12pt; }')

    # Table
    rules.append('.doc-preview table { border-collapse: collapse; width: 100%; margin: 4pt 0; }')
    rules.append('.doc-preview td, .doc-preview th { border: 1pt solid #000; padding: 4pt 6pt; vertical-align: top; text-align: left; }')
    rules.append('.doc-preview th { font-weight: bold; background-color: #f2f2f2; }')

    # Margins
    rules.append('.doc-preview p { margin: 0; }')
    rules.append('.doc-preview h1, .doc-preview h2, .doc-preview h3, .doc-preview h4, .doc-preview h5, .doc-preview h6 { margin: 12pt 0 6pt; }')
    rules.append('.doc-preview ul, .doc-preview ol { padding-left: 2cm; margin: 2pt 0; }')

    # Images
    rules.append('.doc-preview img { max-width: 100%; height: auto; }')

    # Generate CSS from paragraph styles (for style-name classes)
    from docx.enum.style import WD_STYLE_TYPE
    for style in doc.styles:
        if style.type is None or style.type != WD_STYLE_TYPE.PARAGRAPH:
            continue
        css = _style_to_css(style)
        if css:
            name = _sanitize(style.name)
            rules.append(f'.doc-preview .{name} {{ {css} }}')

    return '\n'.join(rules)


def _style_to_css(style) -> str:
    """Convert a python-docx style to CSS."""
    parts = []
    rpr = style.element.find(qn('w:rPr'))
    font_en = style.font.name or ""
    font_cn = ""
    if rpr is not None:
        rf = rpr.find(qn('w:rFonts'))
        if rf is not None:
            font_en = font_en or rf.get(qn('w:ascii')) or rf.get(qn('w:hAnsi')) or ""
            font_cn = rf.get(qn('w:eastAsia')) or ""

    fonts = []
    if font_en and font_en.lower() not in ('inherit', ''):
        fonts.append(f"'{font_en}'")
    if font_cn and font_cn != font_en:
        fonts.append(f"'{font_cn}'")
    if fonts:
        fonts.append('serif')
        parts.append(f'font-family: {", ".join(fonts)};')

    if style.font.size:
        parts.append(f'font-size: {style.font.size.pt:.1f}pt;')
    elif rpr is not None:
        sz = rpr.find(qn('w:sz'))
        if sz is not None:
            try:
                parts.append(f'font-size: {int(sz.get(qn("w:val"))) / 2:.1f}pt;')
            except (ValueError, TypeError):
                pass
    if style.font.bold:
        parts.append('font-weight: bold;')
    if style.font.italic:
        parts.append('font-style: italic;')
    if style.font.color and style.font.color.rgb:
        parts.append(f'color: #{style.font.color.rgb};')

    pf = style.paragraph_format
    if pf.alignment is not None:
        am = {0: 'left', 1: 'center', 2: 'right', 3: 'justify', 4: 'start', 5: 'end', 6: 'distribute'}
        parts.append(f'text-align: {am.get(pf.alignment, "left")};')
    if pf.first_line_indent:
        parts.append(f'text-indent: {_emu_to_cm(pf.first_line_indent):.2f}cm;')
    if pf.line_spacing:
        parts.append(f'line-height: {pf.line_spacing:.2f};' if isinstance(pf.line_spacing, float) else f'line-height: {pf.line_spacing};')
    if pf.space_before:
        parts.append(f'margin-top: {pf.space_before.pt:.1f}pt;')
    if pf.space_after:
        parts.append(f'margin-bottom: {pf.space_after.pt:.1f}pt;')
    return ' '.join(parts)


def _render_hf(section, hf_type: str) -> str:
    """Render header or footer as HTML, including images and formatted text."""
    try:
        hf = section.header if hf_type == "header" else section.footer
        if hf is None:
            return ""

        # Get the header/footer part for image relationship access
        try:
            hf_part = hf.part
        except Exception:
            hf_part = None

        inner_parts = []
        for para in hf.paragraphs:
            para_html = _hf_paragraph_to_html(para, hf_part)
            if para_html:
                inner_parts.append(para_html)

        if not inner_parts:
            return ""

        inner = '\n'.join(inner_parts)
        cls = 'hf hf-header' if hf_type == "header" else 'hf hf-footer'
        return f'<div class="{cls}">\n{inner}\n</div>'
    except Exception:
        return ""


def _hf_paragraph_to_html(para, hf_part) -> str:
    """Convert a header/footer paragraph to HTML, extracting images from runs."""
    if not para.runs and (not para.text or not para.text.strip()):
        xml = para._element.xml if hasattr(para, '_element') else ''
        if 'drawing' in xml or 'pict' in xml:
            pass
        else:
            return '<p>&nbsp;</p>'

    inner = []
    for run in para.runs:
        if run.text:
            inner.append(_hf_run_text(run))
        img_html = _hf_extract_images(run, hf_part)
        if img_html:
            inner.append(img_html)

    result = ''.join(inner)
    if not result:
        img_html = _hf_para_level_images(para, hf_part)
        if img_html:
            result = img_html
        else:
            return '<p>&nbsp;</p>'

    # Apply paragraph alignment
    style = ''
    try:
        if para.alignment is not None:
            am = {0: 'left', 1: 'center', 2: 'right', 3: 'justify',
                  4: 'start', 5: 'end', 6: 'distribute'}
            style = f' style="text-align: {am.get(para.alignment, "left")};"'
    except Exception:
        pass

    return f'<p{style}>{result}</p>'


def _hf_run_text(run) -> str:
    """Render run text with basic formatting tags."""
    text = run.text or ''
    if not text:
        return ''
    rpr = run._r.find(qn('w:rPr')) if hasattr(run, '_r') else None
    styles = []
    if rpr is not None:
        rf = rpr.find(qn('w:rFonts'))
        if rf is not None:
            fn = rf.get(qn('w:ascii')) or rf.get(qn('w:hAnsi'))
            if fn:
                styles.append(f"font-family: '{fn}';")
        sz = rpr.find(qn('w:sz'))
        if sz is not None:
            try:
                styles.append(f'font-size: {int(sz.get(qn("w:val"))) / 2:.1f}pt;')
            except (ValueError, TypeError):
                pass
        if rpr.find(qn('w:b')) is not None:
            text = f'<strong>{text}</strong>'
        if rpr.find(qn('w:i')) is not None:
            text = f'<em>{text}</em>'
        if rpr.find(qn('w:u')) is not None:
            text = f'<u>{text}</u>'
    if styles:
        joined = ' '.join(styles)
        text = f'<span style="{joined}">{text}</span>'
    return text


def _hf_extract_images(run, hf_part) -> str:
    """Extract image from a run's drawing/picture elements and return <img> tag."""
    if not hasattr(run, '_r'):
        return ''
    r_elem = run._r
    imgs = []

    WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
    A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    PIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
    REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

    for drawing in r_elem:
        # Track image dimensions across iterations
        width_px = None
        height_px = None
        for elem in drawing.iter():
            local = etree.QName(elem).localname if hasattr(elem, 'tag') else ''

            # Get image dimensions from extent
            if local == 'extent':
                cx = elem.get('cx')
                cy = elem.get('cy')
                if cx and cy:
                    try:
                        width_px = int(int(cx) / 914400 * 96)
                        height_px = int(int(cy) / 914400 * 96)
                    except (ValueError, TypeError):
                        pass

            # Get image data from blip
            if local == 'blip':
                r_embed = elem.get(f'{{{REL_NS}}}embed')
                if r_embed and hf_part:
                    try:
                        rel = hf_part.rels[r_embed]
                        img_data = rel.target_part.blob
                        b64 = base64.b64encode(img_data).decode('utf-8')
                        ctype = rel.target_part.content_type or 'image/png'

                        dims = ''
                        if width_px:
                            dims += f' width="{width_px}"'
                        if height_px:
                            dims += f' height="{height_px}"'

                        imgs.append(f'<img src="data:{ctype};base64,{b64}"{dims} />')
                    except Exception:
                        pass

    return '\n'.join(imgs)


def _hf_para_level_images(para, hf_part) -> str:
    """Extract images placed directly at paragraph level (not inside runs)."""
    if not hasattr(para, '_element'):
        return ''
    imgs = []
    for drawing in para._element.iter():
        local = etree.QName(drawing).localname if hasattr(drawing, 'tag') else ''
        if local == 'blip':
            r_embed = drawing.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
            if r_embed and hf_part:
                try:
                    rel = hf_part.rels[r_embed]
                    img_data = rel.target_part.blob
                    b64 = base64.b64encode(img_data).decode('utf-8')
                    ctype = rel.target_part.content_type or 'image/png'
                    imgs.append(f'<img src="data:{ctype};base64,{b64}" />')
                except Exception:
                    pass
    return '\n'.join(imgs)


def _sanitize(name: str) -> str:
    """Convert style name to valid CSS class."""
    import re
    s = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    if s and s[0].isdigit():
        s = '_' + s
    return f's_{s}' if s else ''


def _emu_to_cm(emu) -> float:
    """Convert EMU to centimeters."""
    if emu is None:
        return 0.0
    return float(emu) / 914400 * 2.54
