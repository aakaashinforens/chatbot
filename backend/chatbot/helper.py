import re

def linkify_urls(self, text):
    # Match http/https URLs or any word ending with .com (excluding trailing punctuation)
    url_pattern = r"((?:https?://[^\s\)\]\}\.,!]+)|(?:\b[\w.-]+\.com.\b))"
    return re.sub(
        url_pattern,
        r'<a href="\1" target="_blank" class="cta-link">\1</a>',
        text
    )
