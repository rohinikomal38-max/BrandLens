import re
from typing import List

from .models import ReviewFinding


# These patterns identify language that may require
# supporting evidence or human review.
#
# IMPORTANT:
# These are advisory patterns, not proof that a claim is false.
UNSUPPORTED_CLAIM_PATTERNS = [
    (
        r"(?<!\w)100%(?!\w)",
        "absolute percentage claim",
    ),
    (
        r"\bguarantee(?:s|d)?\b",
        "guarantee claim",
    ),
    (
        r"\b(?:the\s+)?(?:best|better\s+than)\b",
        "comparative claim",
    ),
    (
        r"\b(?:number\s+one|no\.?\s*1|#1)\b",
        "ranking claim",
    ),
    (
        r"\b(?:only|the\s+only)\b",
        "exclusivity claim",
    ),
    (
        r"\b(?:proven|scientifically\s+proven)\b",
        "evidence claim",
    ),
    (
        r"\b(?:always|never)\b",
        "absolute claim",
    ),
]


def check_unsupported_claims(
    text: str,
) -> List[ReviewFinding]:
    """
    Detect potentially unsupported marketing claims.

    These findings are advisory. A detected pattern does NOT prove
    that the claim is false or prohibited.

    No external AI service is required.
    """

    findings: List[ReviewFinding] = []

    for pattern, claim_category in UNSUPPORTED_CLAIM_PATTERNS:
        regex = re.compile(pattern, re.IGNORECASE)

        for match in regex.finditer(text):
            matched_text = match.group(0)

            findings.append(
                ReviewFinding(
                    type="unsupported_claim",
                    severity="medium",
                    message=(
                        f"Potential {claim_category}: "
                        f"'{matched_text}'"
                    ),
                    matched_text=matched_text,
                    explanation=(
                        f"The phrase '{matched_text}' may require "
                        "supporting evidence before publication."
                    ),
                    evidence=(
                        "Deterministic claim-risk pattern; "
                        "evidence verification recommended."
                    ),
                    suggestion=(
                        "Verify the claim against approved evidence "
                        "or use more specific wording."
                    ),
                    advisory=True,
                    start=match.start(),
                    end=match.end(),
                )
            )

    return findings