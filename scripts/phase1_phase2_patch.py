import re
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
html_files = [root / name for name in [
    'index.html', 'menu-grid-v3.html', 'about-us.html', 'contact.html',
    'blog.html', 'gallery-4-cols.html', 'reservation.html', '404-error.html'
] if (root / name).exists()]

mobile_nav = '''<ul id="menu-menu-2" class="menu-nav-2">
                    <li class="menu-item"><a href="index.html">Home</a></li>
                    <li class="menu-item"><a href="menu-grid-v3.html">Menu</a></li>
                    <li class="menu-item"><a href="about-us.html">About Us</a></li>
                    <li class="menu-item"><a href="reservation.html">Reservation</a></li>
                    <li class="menu-item"><a href="gallery-4-cols.html">Gallery</a></li>
                    <li class="menu-item"><a href="blog.html">Blog</a></li>
                    <li class="menu-item"><a href="contact.html">Contact</a></li>
                </ul>'''

desk_nav = '''<ul id="menu-menu-1" class="menu-nav menu-nav-1">
                            <li class="menu-item"><a href="index.html">Home</a></li>
                            <li class="menu-item"><a href="menu-grid-v3.html">Menu</a></li>
                            <li class="menu-item"><a href="about-us.html">About Us</a></li>
                            <li class="menu-item"><a href="reservation.html">Reservation</a></li>
                            <li class="menu-item"><a href="gallery-4-cols.html">Gallery</a></li>
                            <li class="menu-item"><a href="blog.html">Blog</a></li>
                            <li class="menu-item"><a href="contact.html">Contact</a></li>
                        </ul>'''

broken_links = {
    'index-2.html': 'index.html',
    'homepage-2.html': 'index.html',
    'homepage-3.html': 'index.html',
    'homepage-4.html': 'index.html',
    'homepage-5.html': 'index.html',
    'homepage-6.html': 'index.html',
    'homepage-7.html': 'index.html',
    'homepage-8.html': 'index.html',
    'homepage-9.html': 'index.html',
    'homepage-10.html': 'index.html',
    'homepage-video.html': 'index.html',
    'menu-1-col.html': 'menu-grid-v3.html',
    'menu-2-col.html': 'menu-grid-v3.html',
    'menu-3-col.html': 'menu-grid-v3.html',
    'menu-accordion.html': 'menu-grid-v3.html',
    'menu-grid-v2.html': 'menu-grid-v3.html',
    'menu-grid-image.html': 'menu-grid-v3.html',
    'blog-single-post.html': 'blog.html',
    'blog-classic.html': 'blog.html',
    'blog-grid.html': 'blog.html',
    'blog-grid-3-cols.html': 'blog.html',
    'blog-fullwidth.html': 'blog.html',
    'blog-left-sidebar.html': 'blog.html',
    'contact-2.html': 'contact.html',
    'contact-3.html': 'contact.html',
    'team-2-cols.html': 'about-us.html',
    'team-3-cols.html': 'about-us.html',
    'header-2.html': 'index.html',
    'header-3.html': 'index.html',
    'header-4.html': 'index.html',
    'header-5.html': 'index.html',
    'header-6.html': 'index.html',
    'gallery-full-screen-3-cols.html': 'gallery-4-cols.html',
    'gallery-full-screen-4-cols.html': 'gallery-4-cols.html',
    'reservation.html': 'reservation.html'
}

replacements = [
    ('<title>About us - Dina</title>', '<title>About us - Savannah Spice</title>'),
    ('<title>Contact - Dina</title>', '<title>Contact - Savannah Spice</title>'),
    ('<title>Blog List - Dina</title>', '<title>Blog List - Savannah Spice</title>'),
    ('<title>Gallery 4 Columns - Dina</title>', '<title>Gallery 4 Columns - Savannah Spice</title>'),
    ('<title>Reservation - Dina</title>', '<title>Reservation - Savannah Spice</title>'),
    ('<title>404 Error - Dina</title>', '<title>404 Error - Savannah Spice</title>'),
    ('<title>About us - Dina</title>', '<title>About us - Savannah Spice</title>'),
]

# Copy style.css into css/style.css if needed.
old_style = root / 'style.css'
new_style = root / 'css' / 'style.css'
if old_style.exists() and not new_style.exists():
    shutil.copy2(old_style, new_style)
    # leave original; update references only


for html_path in html_files:
    text = html_path.read_text(encoding='utf-8')
    original = text

    text = text.replace('Dina', 'Savannah Spice')
    text = text.replace('images/logo-dina-white.png', 'images/icons/logo.jpg')
    text = text.replace('href="index-2.html"', 'href="index.html"')
    text = text.replace('href="index- 2.html"', 'href="index.html"')
    text = text.replace('href="index - 2.html"', 'href="index.html"')
    text = text.replace('href="index -2.html"', 'href="index.html"')
    for wrong, right in broken_links.items():
        text = text.replace(f'href="{wrong}"', f'href="{right}"')

    text = text.replace('href="menu-grid-v3-2cols.html"', 'href="menu-grid-v3.html"')
    text = text.replace('href="menu-grid-v3-4cols.html"', 'href="gallery-4-cols.html"')
    text = text.replace('href="menu-grid-v3-5cols.html"', 'href="gallery-4-cols.html"')
    text = text.replace('href="gallery-full-screen-3-cols.html"', 'href="gallery-4-cols.html"')
    text = text.replace('href="gallery-full-screen-4-cols.html"', 'href="gallery-4-cols.html"')

    # Fix logo href location in top nav items and root style path
    text = text.replace('href=\'style.css\'', 'href=\'css/style.css\'')
    text = text.replace('href="style.css"', 'href="css/style.css"')

    # Fix 404 button and return home anchors
    text = text.replace('href="index-2.html"', 'href="index.html"')
    text = text.replace('href="index.html""', 'href="index.html"')

    # Replace menu holder in menu-grid-v3 with dynamic container
    if html_path.name == 'menu-grid-v3.html':
        start_token = '<div class="menu-holder menu-holder-v3">'
        if start_token in text:
            start = text.index(start_token)
            depth = 0
            pos = start
            while pos < len(text):
                if text.startswith('<div', pos):
                    depth += 1
                    pos += 4
                elif text.startswith('</div>', pos):
                    depth -= 1
                    pos += 6
                    if depth == 0:
                        end = pos
                        break
                else:
                    pos += 1
            if 'end' in locals():
                text = text[:start] + '<div id="menu-items" class="menu-holder menu-holder-v3"></div>' + text[end:]

    # Use a simplified mobile and desktop nav on all pages
    def replace_top_ul(html, list_id, replacement):
        start_match = re.search(rf'<ul\s+id="{list_id}"[^>]*>', html)
        if not start_match:
            return html
        start = start_match.start()
        pos = start_match.end()
        depth = 1
        while pos < len(html):
            if html.startswith('<ul', pos):
                depth += 1
                pos += 3
            elif html.startswith('</ul>', pos):
                depth -= 1
                pos += 5
                if depth == 0:
                    end = pos
                    break
            else:
                pos += 1
        if 'end' in locals():
            return html[:start] + replacement + html[end:]
        return html

    text = replace_top_ul(text, 'menu-menu-2', mobile_nav)
    text = replace_top_ul(text, 'menu-menu-1', desk_nav)

    # Standardize 404 return button
    text = text.replace('href="index-2.html"', 'href="index.html"')
    text = text.replace('href="index.html""', 'href="index.html"')

    if text != original:
        html_path.write_text(text, encoding='utf-8')

print('Phase 1/2 patch complete.')
