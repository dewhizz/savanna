import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html_files = [p for p in root.glob('*.html') if p.is_file()]

mobile_pat = re.compile(r'(<div\s+class="nav-holder nav-holder-2">).*?(</div>)', re.S)
desktop_pat = re.compile(r'(<div\s+class="nav-holder nav-holder-1 nav-holder-desktop">).*?(</div>)', re.S)
init_pat = re.compile(r'(<script\s+src=["\']js/init\.js["\']>\s*</script>)')

for path in html_files:
    text = path.read_text(encoding='utf-8')
    updated = text
    if 'js/shared-navbar.js' not in updated:
        updated, mobile_count = mobile_pat.subn(r"\1\n    <ul id=\"menu-menu-2\" class=\"menu-nav menu-nav-2\"></ul>\n\2", updated)
        updated, desktop_count = desktop_pat.subn(r"\1\n    <ul id=\"menu-menu-1\" class=\"menu-nav menu-nav-1\"></ul>\n\2", updated)
        if mobile_count or desktop_count:
            print(f'Patched nav placeholders in {path.name}')
        updated, count = init_pat.subn(r"\1\n    <script src='js/shared-navbar.js'></script>", updated)
        if count:
            print(f'Added shared-navbar include in {path.name}')
    if updated != text:
        path.write_text(updated, encoding='utf-8')
