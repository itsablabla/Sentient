import json
import logging
import re

class JsonExtractor:
    @staticmethod
    def extract_valid_json(text: str) -> dict:
        """
        Parses JSON from a string, handling potential extra text/formatting.
        Useful for LLM outputs or mixed-format messages.
        """
        if not text:
            return None
            
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        # Try to find JSON object {} if mixed with text
        try:
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
        except (json.JSONDecodeError, AttributeError):
            pass

        logging.warning(f"Failed to extract JSON from text: {text}")
        return None
