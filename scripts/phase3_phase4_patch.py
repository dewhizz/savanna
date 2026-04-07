import re
from pathlib import Path
root = Path(__file__).resolve().parent.parent
html_files = [root / name for name in [
    'index.html', 'menu-grid-v3.html', 'about-us.html', 'contact.html',
    'blog.html', 'gallery-4-cols.html', 'reservation.html', '404-error.html'
] if (root / name).exists()]

instagram_block = """
      <div id=\"instagram-feed\" class=\"footer-instagram\">\n        <h5>Instagram</h5>\n        <div class=\"instagram-placeholder\">Connect your Instagram account to show live photos.</div>\n      </div>\n"""

for html_path in html_files:
    text = html_path.read_text(encoding='utf-8')
    original = text

    # Add Instagram widget placeholder before footer social if not present
    if '<div id="instagram-feed"' not in text:
        text = text.replace('      <!-- FOOTER SOCIAL -->', instagram_block + '      <!-- FOOTER SOCIAL -->')

    # Add instagram feed script after init.js if not already present
    if "js/instagram-feed.js" not in text:
        text = text.replace("<script  src='js/init.js'></script>", "<script  src='js/init.js'></script>\n        <script src='js/instagram-feed.js'></script>")
        text = text.replace("<script src='js/init.js'></script>", "<script src='js/init.js'></script>\n  <script src='js/instagram-feed.js'></script>")

    if html_path.name == 'menu-grid-v3.html':
        if "js/menu-sheet.js" not in text:
            text = text.replace("<script  src='js/init.js'></script>", "<script  src='js/init.js'></script>\n        <script src='js/menu-sheet.js'></script>")
            
    if html_path.name == 'blog.html':
        if '<section class="share-experience' not in text:
            insert_point = text.index('  <!-- FOOTER -->')
            blog_section = """
  <section class=\"share-experience margin-b72\">
    <div class=\"container\">
      <div class=\"headline\">
        <h2>Share Your Experience</h2>
        <p>Tell the community what you loved about Savannah Spice.</p>
      </div>
      <div class=\"row\">
        <div class=\"col-md-8 offset-md-2\">
          <form id=\"share-experience-form\" action=\"javascript:void(0);\" method=\"post\" class=\"contact-form\">
            <div class=\"row\">
              <div class=\"col-md-6\"><label>Name*</label><input id=\"share-name\" name=\"name\" class=\"reservation-fields\" type=\"text\" required /></div>
              <div class=\"col-md-6\"><label>Email*</label><input id=\"share-email\" name=\"email\" class=\"reservation-fields\" type=\"email\" required /></div>
            </div>
            <div class=\"row\">
              <div class=\"col-md-12\"><label>Story Title*</label><input id=\"share-title\" name=\"post-title\" class=\"reservation-fields\" type=\"text\" required /></div>
            </div>
            <div class=\"row\">
              <div class=\"col-md-12\"><label>Your Experience*</label><textarea id=\"share-story\" name=\"story\" class=\"reservation-fields\" rows=\"6\" required></textarea></div>
            </div>
            <div id=\"share-form-output\" class=\"output2\"></div>
            <div class=\"alignc\"><input type=\"submit\" value=\"Share Your Story\" /></div>
          </form>
        </div>
      </div>
      <div id=\"community-blog-feed\" class=\"community-blog-feed\"></div>
    </div>
  </section>
"""
            text = text[:insert_point] + blog_section + text[insert_point:]
        if 'js/blog-feed.js' not in text:
            text = text.replace("<script src='js/init.js'></script>", "<script src='js/init.js'></script>\n  <script src='js/blog-feed.js'></script>")

    if html_path.name == 'reservation.html':
        text = text.replace('method="post" id="reservation-form" action="/api/bookings" method="POST"', 'id="reservation-form" action="javascript:void(0);"')
        text = text.replace('name="author" class="reservation-fields"', 'id="name" name="author" class="reservation-fields"')
        text = text.replace('name="email" class="reservation-fields"', 'id="email" name="email" class="reservation-fields"')
        text = text.replace('name="phone" class="reservation-fields"', 'id="phone" name="phone" class="reservation-fields"')
        text = text.replace('<select name="time" class="reservation-fields">', '<select id="time" name="time" class="reservation-fields">')
        text = text.replace('name="persons" class="reservation-fields"', 'id="persons" name="persons" class="reservation-fields"')
        if '<div id="reservation-success"' not in text:
            text = text.replace('<div id="output"></div>', '<div id="reservation-success" class="reservation-success"></div>\n                  <div id="output"></div>')
        if 'https://cdn.emailjs.com/dist/email.min.js' not in text:
            text = text.replace('<script  src=\'js/reservation-form.js\'></script>', '<script  src=\'js/reservation-form.js\'></script>\n    <script src="https://cdn.emailjs.com/dist/email.min.js"></script>')

    if text != original:
        html_path.write_text(text, encoding='utf-8')

print('Phase 3/4 HTML patch complete.')
