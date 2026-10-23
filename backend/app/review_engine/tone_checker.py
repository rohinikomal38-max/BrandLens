import re
from typing import List

from .models import ReviewFinding


# More specific patterns should appear before broader patterns.
# Otherwise a phrase such as "only an idiot" would produce
# both an "idiot" finding and an "only an idiot" finding.
TONE_RISK_PATTERNS = [
    (
        r"\b(?:only an idiot|only a fool)\b",
        "insulting comparative language",
    ),
    (
        r"\b(?:everyone knows|anyone can see)\b",
        "dismissive or presumptive language",
    ),
    (
        r"\b(?:idiot|stupid|dumb|fool)\b",
        "potentially insulting language",
    ),
    (
        r"\b(?:obviously|clearly)\b",
        "overly dismissive language",
    ),
]


def check_tone(text: str) -> List[ReviewFinding]:
    """
    Detect potentially problematic tone.

    Tone findings are advisory because interpretation can
    depend on context and brand guidelines.

    No external AI service is required.
    """

    findings: List[ReviewFinding] = []
    occupied_ranges = []

    for pattern, tone_category in TONE_RISK_PATTERNS:
        regex = re.compile(pattern, re.IGNORECASE)

        for match in regex.finditer(text):
            start = match.start()
            end = match.end()

            # Don't report a smaller finding if its text overlaps
            # with a more specific finding already detected.
            overlaps_existing = any(
                start < existing_end and end > existing_start
                for existing_start, existing_end in occupied_ranges
            )

            if overlaps_existing:
                continue

            matched_text = match.group(0)

            findings.append(
                ReviewFinding(
                    type="tone",
                    severity="medium",
                    message=(
                        f"Potential tone issue: '{matched_text}'"
                    ),
                    matched_text=matched_text,
                    explanation=(
                        f"The phrase '{matched_text}' may create a "
                        f"{tone_category} tone."
                    ),
                    evidence="Configured tone-risk pattern",
                    suggestion=(
                        "Consider using neutral, respectful, "
                        "and brand-appropriate language."
                    ),
                    advisory=True,
                    start=start,
                    end=end,
                )
            )

            occupied_ranges.append((start, end))

    return findings