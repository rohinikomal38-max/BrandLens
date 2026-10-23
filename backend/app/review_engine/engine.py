from typing import List, Optional

from .claim_checker import check_unsupported_claims
from .fact_checker import check_approved_facts
from .models import ApprovedFact, ReviewFinding, ReviewResult
from .rules import check_forbidden_terms, check_required_terms
from .tone_checker import check_tone


class ReviewEngine:
    """
    Main BrandLens review engine.

    Deterministic checks always run locally and do not depend
    on an external AI API.

    AI/advisory analysis can be added later without making
    the deterministic review unavailable.
    """

    def review(
        self,
        text: str,
        forbidden_terms: Optional[List[str]] = None,
        required_terms: Optional[List[str]] = None,
        approved_facts: Optional[List[ApprovedFact]] = None,
    ) -> ReviewResult:
        """
        Review a marketing draft against configured brand rules.

        Parameters:
            text:
                Draft marketing content to review.

            forbidden_terms:
                Terms that must not appear in the draft.

            required_terms:
                Terminology that should appear in the draft.

            approved_facts:
                Brand-approved facts used for deterministic
                contradiction checking.

        Returns:
            ReviewResult containing all detected findings.
        """

        findings: List[ReviewFinding] = []

        forbidden_terms = forbidden_terms or []
        required_terms = required_terms or []
        approved_facts = approved_facts or []

        # --------------------------------------------------
        # 1. Deterministic forbidden-term checks
        # --------------------------------------------------

        findings.extend(
            check_forbidden_terms(
                text,
                forbidden_terms,
            )
        )

        # --------------------------------------------------
        # 2. Deterministic required-terminology checks
        # --------------------------------------------------

        findings.extend(
            check_required_terms(
                text,
                required_terms,
            )
        )

        # --------------------------------------------------
        # 3. Deterministic approved-fact checks
        # --------------------------------------------------

        findings.extend(
            check_approved_facts(
                text,
                approved_facts,
            )
        )

        # --------------------------------------------------
        # 4. Advisory unsupported-claim checks
        # --------------------------------------------------

        findings.extend(
            check_unsupported_claims(text)
        )

        # --------------------------------------------------
        # 5. Advisory tone checks
        # --------------------------------------------------

        findings.extend(
            check_tone(text)
        )

        # --------------------------------------------------
        # Determine overall status
        # --------------------------------------------------

        has_high_severity_issue = any(
            finding.severity == "high" and not finding.advisory
            for finding in findings
        )

        if has_high_severity_issue:
            status = "needs_review"
        elif findings:
            status = "advisory_review"
        else:
            status = "approved"

        return ReviewResult(
            status=status,
            findings=findings,
        )