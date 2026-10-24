
import { useState } from "react";
import "./App.css";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type ApiDraft = {
  id: number;
  title: string;
  content: string;
  content_type: string | null;
  status: string;
};

type ApiFinding = {
  type: string;
  severity: string;
  message: string;
  matched_text: string | null;
  explanation: string | null;
  evidence: string | null;
  suggestion: string | null;
  advisory: boolean;
  start: number | null;
  end: number | null;
};

type ApiReview = {
  status: string;
  has_issues: boolean;
  findings: ApiFinding[];
};

type Finding = {
  id: number;
  phrase: string;
  severity: "High" | "Medium" | "Low";
  explanation: string;
  suggestion: string;
  rule: string;
};

type Rule = {
  id: number;
  title: string;
  description: string;
  blockedPhrase: string;
  suggestion: string;
};

const initialRules: Rule[] = [
  {
    id: 1,
    title: "Avoid guaranteed claims",
    description: "Do not promise outcomes that cannot be guaranteed.",
    blockedPhrase: "guaranteed results",
    suggestion: "results may vary",
  },
  {
    id: 2,
    title: "Avoid artificial urgency",
    description: "Avoid pressure-based promotional wording.",
    blockedPhrase: "buy now or miss out",
    suggestion: "explore the offer",
  },
  {
    id: 3,
    title: "Use approved terminology",
    description: 'Use "customers" instead of "consumers".',
    blockedPhrase: "consumers",
    suggestion: "customers",
  },
];



function App() {
  const [page, setPage] = useState<"Review" | "Brand rules" | "History">(
    "Review",
  );
  const [draft, setDraft] = useState("");
  const [contentType, setContentType] = useState("Social media");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [rules, setRules] = useState(initialRules);
  const [reviewed, setReviewed] = useState(false);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Draft");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [rulePhrase, setRulePhrase] = useState("");
  const [ruleSuggestion, setRuleSuggestion] = useState("");
const [isReviewing, setIsReviewing] = useState(false);
 const runReview = async () => {
  if (!draft.trim()) {
    setNotice("Add some content before starting the review.");
    return;
  }

  if (draft.length > 10000) {
    setNotice("Review content must be 10,000 characters or fewer.");
    return;
  }

  setIsReviewing(true);
  setNotice("");

  try {
   // Create a fresh backend draft for every review so the saved
// content always matches the text being reviewed.
const draftResponse = await fetch(`${API_BASE_URL}/api/drafts/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: `${contentType} draft`,
    content: draft,
    content_type: contentType,
  }),
});

if (!draftResponse.ok) {
  const error = await draftResponse.json().catch(() => null);
  throw new Error(
    error?.detail || `Draft creation failed (${draftResponse.status}).`,
  );
}

const createdDraft: ApiDraft = await draftResponse.json();
const draftId = createdDraft.id;


    // Ask the real backend review engine to evaluate the draft.
    const reviewResponse = await fetch(`${API_BASE_URL}/api/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_id: draftId,
        text: draft,
      }),
    });

    if (!reviewResponse.ok) {
      const error = await reviewResponse.json().catch(() => null);
      throw new Error(
        error?.detail || `Review failed (${reviewResponse.status}).`,
      );
    }

    const result: ApiReview = await reviewResponse.json();

    const mappedFindings: Finding[] = result.findings.map(
      (finding, index) => {
        const severity = finding.severity.toLowerCase();

        return {
          id: index + 1,
          phrase: finding.matched_text || finding.message,
          severity:
            severity === "high" || severity === "critical"
              ? "High"
              : severity === "low" ||
                  severity === "info" ||
                  severity === "informational"
                ? "Low"
                : "Medium",
          explanation:
            finding.explanation || finding.message,
          suggestion:
            finding.suggestion || "Review this wording manually.",
          rule: finding.type,
        };
      },
    );

    setFindings(mappedFindings);
    setReviewed(true);

    const backendStatus = result.status.toLowerCase();

    setStatus(
      backendStatus === "needs_review"
        ? "Needs review"
        : backendStatus === "advisory_review"
          ? "Advisory review"
          : "Ready for approval",
    );

    setNotice(
      mappedFindings.length === 0
        ? "Backend review complete. No findings were returned. Human review is still recommended."
        : `Backend review complete: ${mappedFindings.length} finding(s) detected.`,
    );

    setHistory((items) => [
      `${new Date().toLocaleString()} — Backend review completed (${mappedFindings.length} finding(s))`,
      ...items,
    ]);
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "Unable to connect to the BrandLens API.",
    );
      } finally {
    setIsReviewing(false);
  }
};

   const applySuggestion = (finding: Finding) => {
    const escaped = finding.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const updated = draft.replace(
      new RegExp(escaped, "i"),
      finding.suggestion,
    );

    setDraft(updated);
    setFindings((items) => items.filter((item) => item.id !== finding.id));
    setNotice("Suggestion applied. Review the updated draft before approval.");
    setStatus("Changes made");
  };


  const addRule = () => {
    if (!rulePhrase.trim() || !ruleSuggestion.trim()) {
      setNotice("Enter both a phrase to flag and its suggested replacement.");
      return;
    }

    setRules((items) => [
      ...items,
      {
        id: Math.max(0, ...items.map((item) => item.id)) + 1,
        title: `Custom rule ${items.length + 1}`,
        description: `Flag "${rulePhrase}" and suggest "${ruleSuggestion}".`,
        blockedPhrase: rulePhrase.trim(),
        suggestion: ruleSuggestion.trim(),
      },
    ]);
    setRulePhrase("");
    setRuleSuggestion("");
    setNotice("Rule added to this session.");
  };

  const decide = (decision: "Approved" | "Changes requested") => {
    setStatus(decision);
    setNotice(
      decision === "Approved"
        ? "Draft marked approved in this local prototype."
        : "Changes requested. The draft owner can revise the content.",
    );
    setHistory((items) => [
      `${new Date().toLocaleString()} — ${decision}${comment ? `: ${comment}` : ""}`,
      ...items,
    ]);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <strong>BrandLens</strong>
            <span>Brand governance</span>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation">
          {(["Review", "Brand rules", "History"] as const).map((item) => (
            <button
              key={item}
              className={`nav-item ${page === item ? "active" : ""}`}
              onClick={() => {
                setPage(item);
                setNotice("");
              }}
            >
              <span className="nav-symbol">
                {item === "Review" ? "▤" : item === "Brand rules" ? "◇" : "◷"}
              </span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="avatar">CC</div>
          <div>
            <strong>CodeCatalyst</strong>
            <span>Team workspace</span>
          </div>
          <span className="online-dot" />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-label">DEMO WORKSPACE</span>
            <div className="avatar small">CC</div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                className="notice-close"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}

          {page === "Review" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">CONTENT QUALITY & GOVERNANCE</div>
                  <h1>Review your content</h1>
                  <p>
                    Check drafts against your brand rules before they go live.
                  </p>
                </div>
                <span className={`status-badge ${status.toLowerCase().replaceAll(" ", "-")}`}>
                  <span className="status-dot" />
                  {status}
                </span>
              </section>

              <div className="workflow-steps">
                <div className="workflow-step current">
                  <span>01</span>
                  <div>
                    <strong>Draft</strong>
                    <small>Add your content</small>
                  </div>
                </div>
                <div className="step-line" />
                <div className={`workflow-step ${reviewed ? "complete" : ""}`}>
                  <span>02</span>
                  <div>
                    <strong>Review</strong>
                    <small>Check brand compliance</small>
                  </div>
                </div>
                <div className="step-line" />
                <div className={`workflow-step ${status === "Approved" ? "complete" : ""}`}>
                  <span>03</span>
                  <div>
                    <strong>Decision</strong>
                    <small>Human approval</small>
                  </div>
                </div>
              </div>

              <div className="review-grid">
                <section className="panel editor-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">STEP 01</span>
                      <h2>Content draft</h2>
                    </div>
                    <span className="neutral-tag">Editable</span>
                  </div>

                  <label htmlFor="content-type">Content type</label>
                  <select
                    id="content-type"
                    value={contentType}
                    onChange={(event) => setContentType(event.target.value)}
                  >
                    <option>Social media</option>
                    <option>Marketing email</option>
                    <option>Website copy</option>
                    <option>Advertisement</option>
                    <option>Blog post</option>
                  </select>

                  <label htmlFor="draft-text">Your draft</label>
                  <textarea
                    id="draft-text"
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      setReviewed(false);
                      setStatus("Draft");
                    }}
                    placeholder="Paste your marketing copy here. BrandLens will check it against the configured demo rules..."
                    rows={12}
                  />

                  <div className="editor-footer">
                    <span>{draft.length} characters</span>
                    <span>{draft.trim() ? draft.trim().split(/\s+/).length : 0} words</span>
                  </div>
<button
  className="primary-button full-button"
  onClick={runReview}
  disabled={isReviewing}
>
  <span>✳</span> {isReviewing ? "Reviewing..." : "Review content"}
</button>

                  <p className="helper-text">
                    Demo rule-based review. No content is published automatically.
                  </p>
                </section>

                <section className="panel results-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">STEP 02</span>
                      <h2>Review findings</h2>
                    </div>
                    {reviewed && (
                      <span className="finding-count">
                        {findings.length} found
                      </span>
                    )}
                  </div>

                  {!reviewed ? (
                    <div className="empty-state">
                      <div className="empty-icon">⌕</div>
                      <h3>Ready when you are</h3>
                      <p>
                        Submit a draft to see potential brand-rule conflicts,
                        explanations, and suggested edits.
                      </p>
                      <button
                        className="text-button"
                        onClick={() =>
                          setDraft(
                            "We offer guaranteed results to all consumers. Buy now or miss out!",
                          )
                        }
                      >
                        Try sample content ↗
                      </button>
                    </div>
                  ) : findings.length === 0 ? (
                    <div className="empty-state success-state">
                      <div className="empty-icon">✓</div>
                      <h3>No matching issues found</h3>
                      <p>
                        This demo check did not find any phrases covered by the
                        current rules. A human reviewer should still verify the draft.
                      </p>
                    </div>
                  ) : (
                    <div className="findings-list">
                      {findings.map((finding) => (
                        <article className="finding-card" key={finding.id}>
                          <div className="finding-topline">
                            <span className={`severity ${finding.severity.toLowerCase()}`}>
                              {finding.severity}
                            </span>
                            <span className="rule-reference">{finding.rule}</span>
                          </div>
                          <h3>Potential brand-rule conflict</h3>
                          <p className="matched-phrase">
                            Flagged phrase: <strong>“{finding.phrase}”</strong>
                          </p>
                          <p className="finding-explanation">{finding.explanation}</p>
                          <div className="suggestion-box">
                            <span className="suggestion-label">SUGGESTED EDIT</span>
                            <p>{finding.suggestion}</p>
                          </div>
                          <div className="finding-actions">
                            <button
                              className="primary-button compact"
                              onClick={() => applySuggestion(finding)}
                            >
                              Apply edit
                            </button>
                            <button
                              className="secondary-button compact"
                              onClick={() =>
                                setFindings((items) =>
                                  items.filter((item) => item.id !== finding.id),
                                )
                              }
                            >
                              Dismiss
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="reviewer-section">
                    <div className="reviewer-heading">
                      <div>
                        <span className="panel-kicker">STEP 03</span>
                        <h2>Human review</h2>
                      </div>
                      <span className="human-tag">Reviewer decision</span>
                    </div>
                    <label htmlFor="review-comment">Reviewer comments</label>
                    <textarea
                      id="review-comment"
                      rows={3}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Add feedback or explain requested changes..."
                    />
                    <div className="decision-actions">
                      <button
                        className="secondary-button"
                        onClick={() => decide("Changes requested")}
                      >
                        Request changes
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => decide("Approved")}
                      >
                        ✓ Approve draft
                      </button>
                    </div>
                    <p className="helper-text">
                      Prototype only: decisions are not saved to a server.
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}

          {page === "Brand rules" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">GOVERNANCE SETTINGS</div>
                  <h1>Brand rules</h1>
                  <p>Manage the phrases checked by this local prototype.</p>
                </div>
                <span className="neutral-tag">{rules.length} rules</span>
              </section>

              <section className="panel rules-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Configured rules</h2>
                    <p>Rules are stored in this browser session only.</p>
                  </div>
                </div>

                <div className="rules-list">
                  {rules.map((rule) => (
                    <article className="rule-card" key={rule.id}>
                      <div className="rule-icon">◇</div>
                      <div className="rule-content">
                        <h3>{rule.title}</h3>
                        <p>{rule.description}</p>
                        <div className="rule-phrases">
                          <span>Flag: “{rule.blockedPhrase}”</span>
                          <span>Suggest: “{rule.suggestion}”</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="add-rule-section">
                  <h2>Add a demo rule</h2>
                  <p>Enter a phrase to flag and the suggested replacement.</p>
                  <div className="rule-form">
                    <div>
                      <label htmlFor="blocked-phrase">Phrase to flag</label>
                      <input
                        id="blocked-phrase"
                        value={rulePhrase}
                        onChange={(event) => setRulePhrase(event.target.value)}
                        placeholder="e.g. best in the world"
                      />
                    </div>
                    <div>
                      <label htmlFor="replacement-phrase">Suggested replacement</label>
                      <input
                        id="replacement-phrase"
                        value={ruleSuggestion}
                        onChange={(event) => setRuleSuggestion(event.target.value)}
                        placeholder="e.g. designed for you"
                      />
                    </div>
                    <button className="primary-button" onClick={addRule}>
                      + Add rule
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {page === "History" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">ACTIVITY LOG</div>
                  <h1>Review history</h1>
                  <p>See review and decision activity in this session.</p>
                </div>
                <span className="neutral-tag">{history.length} events</span>
              </section>

              <section className="panel history-panel">
                {history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">◷</div>
                    <h3>No activity yet</h3>
                    <p>Review a draft or record a reviewer decision to see activity here.</p>
                    <button className="text-button" onClick={() => setPage("Review")}>
                      Go to content review →
                    </button>
                  </div>
                ) : (
                  <div className="history-list">
                    {history.map((entry, index) => (
                      <div className="history-entry" key={`${entry}-${index}`}>
                        <span className="history-marker">✓</span>
                        <div>
                          <p>{entry}</p>
                          <span>Local prototype activity</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          <footer className="page-footer">
            <span>BrandLens · CodeCatalyst</span>
            <span>Human-reviewed content governance</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
