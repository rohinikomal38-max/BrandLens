import re
from typing import List

from .models import ApprovedFact, ReviewFinding


def _normalize(text: str) -> str:
    """Normalize whitespace and casing for comparisons."""
    return re.sub(r"\s+", " ", text.strip().casefold())


def _build_negated_variants(statement: str) -> List[str]:
    """
    Build simple deterministic negative variants of an approved fact.

    Example:
        "BrandLens provides rule-based review."

    becomes:
        "BrandLens does not provide rule-based review."
    """

    statement = statement.strip()

    # Pattern for common third-person verbs ending in 's'.
    match = re.match(
        r"^(?P<subject>.+?)\s+"
        r"(?P<verb>provides|supports|offers|uses|allows|helps|"
        r"delivers|creates|includes|requires|ensures)\s+"
        r"(?P<object>.+?)\.?$",
        statement,
        re.IGNORECASE,
    )

    if match:
        subject = match.group("subject")
        verb = match.group("verb").lower()
        obj = match.group("object")

        verb_map = {
            "provides": "provide",
            "supports": "support",
            "offers": "offer",
            "uses": "use",
            "allows": "allow",
            "helps": "help",
            "delivers": "deliver",
            "creates": "create",
            "includes": "include",
            "requires": "require",
            "ensures": "ensure",
        }

        base_verb = verb_map[verb]

        return [
            f"{subject} does not {base_verb} {obj}",
            f"{subject} doesn't {base_verb} {obj}",
        ]

    return []


def check_approved_facts(
    text: str,
    approved_facts: List[ApprovedFact],
) -> List[ReviewFinding]:
    """
    Compare a draft against approved brand facts.

    Deterministic behavior:
    - Exact approved facts are considered supported.
    - Simple explicit contradictions are flagged.
    - Unknown claims are NOT automatically considered false.

    This function does not require an external AI API.
    """

    findings: List[ReviewFinding] = []
    normalized_text = _normalize(text)

    for fact in approved_facts:
        normalized_fact = _normalize(fact.statement)

        if not normalized_fact:
            continue

        # The exact approved fact appears in the draft.
        if normalized_fact in normalized_text:
            continue

        # Check deterministic negative variants.
        negative_variants = _build_negated_variants(fact.statement)

        for variant in negative_variants:
            normalized_variant = _normalize(variant)

            if normalized_variant in normalized_text:
                findings.append(
                    ReviewFinding(
                        type="contradictory_claim",
                        severity="high",
                        message=(
                            "Draft may contradict an approved brand fact."
                        ),
                        matched_text=variant,
                        explanation=(
                            f"The draft appears inconsistent with the "
                            f"approved fact: '{fact.statement}'."
                        ),
                        evidence=fact.source or fact.statement,
                        advisory=False,
                    )
                )
                break

    return findings