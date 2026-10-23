from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ApprovedFact:
    """A fact that has been approved by the brand/team."""

    statement: str
    source: Optional[str] = None


@dataclass
class ReviewFinding:
    """Represents one issue detected during review."""

    type: str
    severity: str
    message: str

    matched_text: Optional[str] = None
    explanation: Optional[str] = None
    evidence: Optional[str] = None
    suggestion: Optional[str] = None

    # True means this finding is advisory.
    # It must not be treated as a guaranteed violation.
    advisory: bool = False

    # Character positions in the original draft.
    start: Optional[int] = None
    end: Optional[int] = None


@dataclass
class ReviewResult:
    """Final result returned by the review engine."""

    status: str
    findings: List[ReviewFinding] = field(default_factory=list)

    @property
    def has_issues(self) -> bool:
        return len(self.findings) > 0