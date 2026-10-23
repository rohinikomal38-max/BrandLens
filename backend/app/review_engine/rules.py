import re
from typing import List

from .models import ReviewFinding


def check_forbidden_terms(
    text: str,
    forbidden_terms: List[str],
) -> List[ReviewFinding]:
    """
    Detect forbidden terms deterministically.

    This check does not depend on an external AI API.
    """

    findings: List[ReviewFinding] = []

    for term in forbidden_terms:
        term = term.strip()

        if not term:
            continue

        pattern = re.compile(
            rf"(?<!\w){re.escape(term)}(?!\w)",
            re.IGNORECASE,
        )

        for match in pattern.finditer(text):
            matched_text = match.group(0)

            findings.append(
                ReviewFinding(
                    type="forbidden_term",
                    severity="high",
                    message=f"Forbidden term detected: '{matched_text}'",
                    matched_text=matched_text,
                    explanation=(
                        f"The term '{matched_text}' is listed as "
                        "restricted brand terminology."
                    ),
                    evidence="Configured forbidden-term rule",
                    advisory=False,
                    start=match.start(),
                    end=match.end(),
                )
            )

    return findings


def check_required_terms(
    text: str,
    required_terms: List[str],
) -> List[ReviewFinding]:
    """
    Detect required terminology that is missing.

    This check is deterministic and does not require AI.
    """

    findings: List[ReviewFinding] = []

    for term in required_terms:
        term = term.strip()

        if not term:
            continue

        pattern = re.compile(
            rf"(?<!\w){re.escape(term)}(?!\w)",
            re.IGNORECASE,
        )

        if not pattern.search(text):
            findings.append(
                ReviewFinding(
                    type="missing_required_term",
                    severity="medium",
                    message=f"Required terminology missing: '{term}'",
                    explanation=(
                        f"The approved terminology '{term}' was not "
                        "found in the draft."
                    ),
                    evidence="Configured required-terminology rule",
                    advisory=False,
                    suggestion=(
                        f"Consider including the approved term '{term}'."
                    ),
                )
            )

    return findings