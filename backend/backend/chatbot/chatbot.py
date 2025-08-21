import requests
import re

class PerplexityChatbot:
    def __init__(self, api_key, content_file_path="inforens_scraped_data.txt"):
        self.api_key = api_key
        self.content_file_path = content_file_path
        self.full_text = self._load_content()

    # Load content from file
    def _load_content(self):
        try:
            with open(self.content_file_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            print("Content file not found.")
            return ""

    # Helper: turn URLs into clickable links
    def linkify_urls(self, text):
        url_pattern = r"(https?://[^\s]+)"
        return re.sub(
            url_pattern,
            r'<a href="\1" target="_blank" class="cta-link">\1</a>',
            text
        )

    # Ask question
    def ask_question(self, user_question):
        if not self.full_text:
            return "No content loaded. Please check the .txt file."

        prompt = (
            "You are an assistant representing Inforens, an organization helping international students. "
            "Your main job is to redirect students to the most relevant page on our website based on their question. "
            "Only use the content provided below — do not use external knowledge or speculation. "
            "If relevant information is found, give a short sentence and add a clear redirect URL. "
            "DO NOT INCLUDE ANY CITATION NUMBERS LIKE [1][2] etc. "
            "If nothing is relevant, say 'Please ask me something relevant to Inforens or reach out to contact@inforens.com'\n\n"
            f"Content:\n{self.full_text}\n\n"
            f"Question: {user_question}\n"
            "Answer:"
        )

        payload = {
            "model": "sonar",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 500
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            raw_answer = response.json()['choices'][0]['message']['content']
            return self.linkify_urls(raw_answer)
        except Exception as e:
            return f"API request failed: {str(e)}"
