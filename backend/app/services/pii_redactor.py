import re

class PIIRedactor:
    """
    Privacy-first PII Redactor for masking personal candidate metadata
    before sending data to LLM pipelines or storing embeddings.
    """
    
    EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    PHONE_REGEX = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    URL_REGEX = r'https?://[^\s]+|www\.[^\s]+|linkedin\.com/in/[^\s]+|github\.com/[^\s]+'
    ZIP_REGEX = r'\b\d{5}(?:[-\s]\d{4})?\b'

    @classmethod
    def redact(cls, text: str) -> tuple[str, dict]:
        """
        Redacts emails, phone numbers, URLs, and attempts name scrubbing from header text.
        Returns scrubbed text and map of original vs placeholder values for re-mapping.
        """
        redactions = {}
        scrubbed = text

        # Redact Emails
        emails = re.findall(cls.EMAIL_REGEX, scrubbed)
        for i, email in enumerate(set(emails)):
            placeholder = f"[EMAIL_{i+1}]"
            redactions[placeholder] = email
            scrubbed = scrubbed.replace(email, placeholder)

        # Redact Phone numbers
        phones = re.findall(cls.PHONE_REGEX, scrubbed)
        for i, phone in enumerate(set(phones)):
            p_str = phone if isinstance(phone, str) else phone[0]
            if len(p_str.strip()) > 6:
                placeholder = f"[PHONE_{i+1}]"
                redactions[placeholder] = p_str
                scrubbed = scrubbed.replace(p_str, placeholder)

        # Redact LinkedIn/GitHub links
        urls = re.findall(cls.URL_REGEX, scrubbed)
        for i, url in enumerate(set(urls)):
            placeholder = f"[LINK_{i+1}]"
            redactions[placeholder] = url
            scrubbed = scrubbed.replace(url, placeholder)

        # Basic Header Candidate Name Redaction (First 3 lines of resume)
        lines = scrubbed.split('\n')
        if lines and len(lines[0].split()) <= 4:
            first_line = lines[0].strip()
            # If line doesn't contain common resume header words
            if first_line and not any(kw in first_line.lower() for kw in ['resume', 'cv', 'curriculum', 'page', 'profile']):
                placeholder = "[CANDIDATE_NAME]"
                redactions[placeholder] = first_line
                lines[0] = placeholder
                scrubbed = '\n'.join(lines)

        return scrubbed, redactions

    @classmethod
    def restore(cls, redacted_text: str, redactions: dict) -> str:
        """Restores original values into scrubbed text."""
        restored = redacted_text
        for placeholder, original in redactions.items():
            restored = restored.replace(placeholder, original)
        return restored
