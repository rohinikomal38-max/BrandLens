from app.review_engine.engine import ReviewEngine
from app.review_engine.tone_checker import check_tone
from app.review_engine.claim_checker import check_unsupported_claims
from app.review_engine.fact_checker import check_approved_facts
from app.review_engine.models import ApprovedFact
from app.review_engine.rules import (
    check_forbidden_terms,
    check_required_terms,
)

def test_forbidden_term_is_detected():
    text = "Our product is guaranteed to deliver results."

    findings = check_forbidden_terms(
        text,
        ["guaranteed"],
    )

    assert len(findings) == 1
    assert findings[0].type == "forbidden_term"
    assert findings[0].matched_text.lower() == "guaranteed"
    assert findings[0].advisory is False


def test_forbidden_term_matching_is_case_insensitive():
    text = "Our product is GUARANTEED to deliver results."

    findings = check_forbidden_terms(
        text,
        ["guaranteed"],
    )

    assert len(findings) == 1


def test_multiple_forbidden_occurrences_are_detected():
    text = "Guaranteed results. Guaranteed performance."

    findings = check_forbidden_terms(
        text,
        ["guaranteed"],
    )

    assert len(findings) == 2


def test_allowed_text_has_no_forbidden_term():
    text = "Our product is designed to help teams."

    findings = check_forbidden_terms(
        text,
        ["guaranteed"],
    )

    assert findings == []


def test_required_term_missing():
    text = "Our tool reviews marketing content."

    findings = check_required_terms(
        text,
        ["AI-assisted"],
    )

    assert len(findings) == 1
    assert findings[0].type == "missing_required_term"


def test_required_term_present():
    text = "Our AI-assisted tool reviews marketing content."

    findings = check_required_terms(
        text,
        ["AI-assisted"],
    )

    assert findings == []


def test_required_term_matching_is_case_insensitive():
    text = "Our AI-ASSISTED tool reviews marketing content."

    findings = check_required_terms(
        text,
        ["ai-assisted"],
    )

    assert findings == []

def test_approved_fact_is_supported():
    text = "BrandLens provides rule-based review."

    facts = [
        ApprovedFact(
            statement="BrandLens provides rule-based review.",
            source="Brand documentation",
        )
    ]

    findings = check_approved_facts(text, facts)

    assert findings == []


def test_contradictory_claim_is_detected():
    text = "BrandLens does not provide rule-based review."

    facts = [
        ApprovedFact(
            statement="BrandLens provides rule-based review.",
            source="Brand documentation",
        )
    ]

    findings = check_approved_facts(text, facts)

    assert len(findings) == 1
    assert findings[0].type == "contradictory_claim"
    assert findings[0].severity == "high"
    assert findings[0].advisory is False


def test_unrelated_claim_is_not_marked_false():
    text = "BrandLens helps marketing teams."

    facts = [
        ApprovedFact(
            statement="BrandLens provides rule-based review.",
            source="Brand documentation",
        )
    ]

    findings = check_approved_facts(text, facts)

    assert findings == []

def test_unsupported_absolute_claim_is_detected():
    text = "Our product is 100% effective."

    findings = check_unsupported_claims(text)

    assert len(findings) == 1
    assert findings[0].type == "unsupported_claim"
    assert findings[0].advisory is True
    assert findings[0].matched_text == "100%"


def test_guarantee_claim_is_advisory():
    text = "Our product guarantees better results."

    findings = check_unsupported_claims(text)

    assert len(findings) == 1
    assert findings[0].type == "unsupported_claim"
    assert findings[0].advisory is True


def test_comparative_claim_is_advisory():
    text = "Our product is the best solution."

    findings = check_unsupported_claims(text)

    assert len(findings) == 1
    assert findings[0].type == "unsupported_claim"
    assert findings[0].advisory is True


def test_normal_marketing_text_has_no_claim_warning():
    text = "Our product helps teams review marketing content."

    findings = check_unsupported_claims(text)

    assert findings == []

def test_tone_issue_is_detected():
    text = "Only an idiot would choose another product."

    findings = check_tone(text)

    assert len(findings) == 1
    assert findings[0].type == "tone"
    assert findings[0].advisory is True


def test_tone_checker_is_case_insensitive():
    text = "Only an IDIOT would choose another product."

    findings = check_tone(text)

    assert len(findings) == 1
    assert findings[0].advisory is True


def test_neutral_tone_has_no_findings():
    text = "Our product helps teams review marketing content."

    findings = check_tone(text)

    assert findings == []

def test_review_engine_returns_approved_for_clean_text():
    engine = ReviewEngine()

    result = engine.review(
        text="Our AI-assisted product helps marketing teams.",
        forbidden_terms=["guaranteed"],
        required_terms=["AI-assisted"],
        approved_facts=[],
    )

    assert result.status == "approved"
    assert result.findings == []


def test_review_engine_combines_multiple_checks():
    engine = ReviewEngine()

    result = engine.review(
        text="Our product is guaranteed to be the best.",
        forbidden_terms=["guaranteed"],
        required_terms=["AI-assisted"],
        approved_facts=[],
    )

    finding_types = [finding.type for finding in result.findings]

    assert "forbidden_term" in finding_types
    assert "missing_required_term" in finding_types
    assert "unsupported_claim" in finding_types

    assert result.status == "needs_review"


def test_review_engine_keeps_advisory_findings_advisory():
    engine = ReviewEngine()

    result = engine.review(
        text="Our product is the best solution.",
        forbidden_terms=[],
        required_terms=[],
        approved_facts=[],
    )

    assert result.status == "advisory_review"

    assert len(result.findings) >= 1

    for finding in result.findings:
        assert finding.advisory is True