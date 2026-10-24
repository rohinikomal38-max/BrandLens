import { useEffect, useState } from "react";
import "./App.css";
import {
  createDraft,
  listBrandRules,
  listDrafts,
  reviewContent,
  createBrandRule,
  saveReviewDecision,
  getReviewDecisions,
  getAllReviewDecisions,
  type ApiFinding,
  type BrandRuleResponse,
  type DraftResponse,
  type ReviewDecisionResponse,
} from "./api";

type Finding = {
  id: number;
  phrase: string;
  severity: "High" | "Medium" | "Low";
  explanation: string;
  suggestion: string;
  rule: string;
  matchedText: string;
  advisory: boolean;
};

type Rule = {
  id: number;
  title: string;
  description: string;
  blockedPhrase: string;
  suggestion: string;
  ruleType: "forbidden_term" | "required_term" | "approved_fact";
  active: boolean;
};

const toFinding = (finding: ApiFinding, index: number): Finding => {
  const severity = finding.severity.toLowerCase();

  return {
    id: finding.id ?? index + 1,
    phrase: finding.matched_text ?? "",
    matchedText: finding.matched_text ?? "",
    severity:
      severity === "high"
        ? "High"
        : severity === "low"
          ? "Low"
          : "Medium",
    explanation: finding.explanation ?? finding.message,
    suggestion: finding.suggestion ?? "Review this content manually.",
    rule: finding.type.replaceAll("_", " "),
    advisory: finding.advisory,
  };
};

const toRule = (rule: BrandRuleResponse): Rule => ({
  id: rule.id,
  title: rule.name,
  description: rule.description ?? "",
  blockedPhrase: rule.value,
  suggestion: "",
  ruleType: rule.rule_type as Rule["ruleType"],
  active: rule.is_active,
});

function App() {
  const [page, setPage] = useState<"Review" | "Brand rules" | "History">(
    "Review",
  );
  const [draft, setDraft] = useState("");
  const [contentType, setContentType] = useState("Social media");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("Demo Reviewer");
  const [status, setStatus] = useState("Draft");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [rulePhrase, setRulePhrase] = useState("");
  const [ruleSuggestion, setRuleSuggestion] = useState("");
  const [ruleType, setRuleType] =
    useState<Rule["ruleType"]>("forbidden_term");
  const [draftId, setDraftId] = useState<number | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<DraftResponse[]>([]);
  const [decisions, setDecisions] = useState<ReviewDecisionResponse[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const loadInitialData = async () => {
  try {
    const [loadedRules, loadedDrafts, loadedDecisions] = await Promise.all([
      listBrandRules(),
      listDrafts(),
      getAllReviewDecisions(),
    ]);

    setRules(loadedRules.map(toRule));
    setSavedDrafts(loadedDrafts);
    setDecisions(loadedDecisions);
    setNotice("Connected to the BrandLens backend.");
  } catch (error) {
    setNotice(
      `Could not load backend data. Ensure FastAPI is running. ${
        error instanceof Error ? error.message : ""
      }`,
    );
  }
};

  const runReview = async () => {
    if (!draft.trim()) {
      setNotice("Add some content before starting the review.");
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      let activeDraftId = draftId;

      if (activeDraftId === null) {
        const savedDraft = await createDraft(
          `BrandLens ${contentType} Draft`,
          draft,
          contentType,
        );

        activeDraftId = savedDraft.id;
        setDraftId(savedDraft.id);
        setSavedDrafts((items) => [savedDraft, ...items]);
      }

      const result = await reviewContent(activeDraftId, draft);
      const mappedFindings = result.findings.map(toFinding);

      setFindings(mappedFindings);
      setReviewed(true);

      const hasHighSeverityFinding = mappedFindings.some(
        (finding) => finding.severity === "High",
      );

      const nextStatus = hasHighSeverityFinding
        ? "Needs review"
        : mappedFindings.length > 0
          ? "Advisory review"
          : "Ready for approval";

      setStatus(nextStatus);
      setHistory((items) => [
        `${new Date().toLocaleString()} — Draft #${activeDraftId} reviewed (${mappedFindings.length} finding(s))`,
        ...items,
      ]);
      setNotice(
        mappedFindings.length === 0
          ? "Review complete. No findings were returned; human review is still recommended."
          : `Review complete: ${mappedFindings.length} finding(s) detected.`,
      );
    } catch (error) {
      setNotice(
        `Review failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setBusy(false);
    }
  };

  const applySuggestion = (finding: Finding) => {
    if (!finding.suggestion || !finding.phrase) {
      setNotice("No automatic suggestion is available for this finding.");
      return;
    }

    const escaped = finding.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const updated = draft.replace(new RegExp(escaped, "i"), finding.suggestion);

    setDraft(updated);
    setReviewed(false);
    setStatus("Changes made");
    setNotice(
      "Suggestion applied locally. Review the updated draft to save the changes.",
    );
  };

  const addRule = async () => {
    if (!rulePhrase.trim()) {
      setNotice("Enter a rule name or phrase first.");
      return;
    }

    setBusy(true);

    try {
      const created = await createBrandRule({
        name: `Custom rule: ${rulePhrase.trim()}`,
        rule_type: ruleType,
        value: rulePhrase.trim(),
        description: ruleSuggestion.trim() || undefined,
      });

      setRules((items) => [toRule(created), ...items]);
      setRulePhrase("");
      setRuleSuggestion("");
      setNotice("Brand rule saved to the backend.");
    } catch (error) {
      setNotice(
        `Could not save the rule: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: "approved" | "changes_requested") => {
    if (draftId === null) {
      setNotice("Review and save a draft before recording a decision.");
      return;
    }

    setBusy(true);

    try {
      const savedDecision = await saveReviewDecision(
        draftId,
        decision,
        reviewer.trim() || "Demo Reviewer",
        comment,
      );

      setDecisions((items) => [savedDecision, ...items]);
      setStatus(
        decision === "approved" ? "Approved" : "Changes requested",
      );
      setHistory((items) => [
        `${new Date().toLocaleString()} — Draft #${draftId}: ${decision}${
          comment ? ` — ${comment}` : ""
        }`,
        ...items,
      ]);
      setNotice("Reviewer decision saved successfully.");
    } catch (error) {
      setNotice(
        `Could not save the decision: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setBusy(false);
    }
  };

  const openDraft = async (selectedId: number) => {
    setBusy(true);

    try {
      const selected = savedDrafts.find((item) => item.id === selectedId);

      if (!selected) {
        setNotice("Draft not found in the loaded list.");
        return;
      }

      setDraftId(selected.id);
      setDraft(selected.content);
      setContentType(selected.content_type ?? "Social media");
      setStatus(
        selected.status
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      );

      const [reviewHistory, savedDecisions] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/drafts/${selected.id}/findings`),
        getReviewDecisions(selected.id),
      ]);

      if (reviewHistory.ok) {
        const body = (await reviewHistory.json()) as {
          findings: ApiFinding[];
        };
        setFindings(body.findings.map(toFinding));
        setReviewed(true);
      }

      setDecisions(savedDecisions);
      setPage("Review");
      setNotice(`Loaded draft #${selected.id}.`);
    } catch (error) {
      setNotice(
        `Could not load the draft: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setBusy(false);
    }
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
                <span
                  className={`status-badge ${status
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
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
                <div
                  className={`workflow-step ${
                    status === "Approved" ? "complete" : ""
                  }`}
                >
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
                    placeholder="Paste your marketing copy here..."
                    rows={12}
                  />

                  <div className="editor-footer">
                    <span>{draft.length} characters</span>
                    <span>
                      {draft.trim() ? draft.trim().split(/\s+/).length : 0} words
                    </span>
                  </div>

                  <button
                    className="primary-button full-button"
                    onClick={runReview}
                    disabled={busy}
                  >
                    <span>✳</span> {busy ? "Working..." : "Review content"}
                  </button>

                  <label htmlFor="saved-drafts">Load saved draft</label>
                  <select
                    id="saved-drafts"
                    value={draftId ?? ""}
                    onChange={(event) => {
                      const id = Number(event.target.value);
                      if (id) void openDraft(id);
                    }}
                  >
                    <option value="">Select a saved draft</option>
                    {savedDrafts.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} — {item.title}
                      </option>
                    ))}
                  </select>

                  <p className="helper-text">
                    Content is reviewed by the backend. Nothing is published
                    automatically.
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
                        Submit a draft to see brand-rule conflicts and
                        suggestions from the backend.
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
                      <h3>No findings returned</h3>
                      <p>
                        The backend did not identify any issues. Human review
                        is still recommended.
                      </p>
                    </div>
                  ) : (
                    <div className="findings-list">
                      {findings.map((finding) => (
                        <article className="finding-card" key={finding.id}>
                          <div className="finding-topline">
                            <span
                              className={`severity ${finding.severity.toLowerCase()}`}
                            >
                              {finding.severity}
                            </span>
                            <span className="rule-reference">{finding.rule}</span>
                          </div>
                          <h3>Potential brand-rule conflict</h3>
                          <p className="matched-phrase">
                            Flagged phrase:{" "}
                            <strong>“{finding.phrase || finding.rule}”</strong>
                          </p>
                          <p className="finding-explanation">
                            {finding.explanation}
                          </p>
                          <div className="suggestion-box">
                            <span className="suggestion-label">
                              SUGGESTED EDIT
                            </span>
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

                    <label htmlFor="reviewer-name">Reviewer name</label>
                    <input
                      id="reviewer-name"
                      value={reviewer}
                      onChange={(event) => setReviewer(event.target.value)}
                      placeholder="Reviewer name"
                    />

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
                        onClick={() => void decide("changes_requested")}
                        disabled={busy || draftId === null}
                      >
                        Request changes
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => void decide("approved")}
                        disabled={busy || draftId === null}
                      >
                        ✓ Approve draft
                      </button>
                    </div>

                    {draftId === null && (
                      <p className="helper-text">
                        Review the draft first to save it before recording a
                        decision.
                      </p>
                    )}
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
                  <p>Manage the rules stored in your backend.</p>
                </div>
                <span className="neutral-tag">{rules.length} rules</span>
              </section>

              <section className="panel rules-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Configured rules</h2>
                    <p>Rules are retrieved from the backend database.</p>
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
                          <span>Value: “{rule.blockedPhrase}”</span>
                          <span>Type: {rule.ruleType}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                  {rules.length === 0 && (
                    <p>No saved rules found. Add a rule below.</p>
                  )}
                </div>

                <div className="add-rule-section">
                  <h2>Add a brand rule</h2>
                  <p>The rule will be saved in the backend database.</p>

                  <div className="rule-form">
                    <div>
                      <label htmlFor="blocked-phrase">Rule value</label>
                      <input
                        id="blocked-phrase"
                        value={rulePhrase}
                        onChange={(event) => setRulePhrase(event.target.value)}
                        placeholder="e.g. guaranteed"
                      />
                    </div>

                    <div>
                      <label htmlFor="replacement-phrase">
                        Description or source
                      </label>
                      <input
                        id="replacement-phrase"
                        value={ruleSuggestion}
                        onChange={(event) =>
                          setRuleSuggestion(event.target.value)
                        }
                        placeholder="Describe this rule"
                      />
                    </div>

                    <div>
                      <label htmlFor="rule-type">Rule type</label>
                      <select
                        id="rule-type"
                        value={ruleType}
                        onChange={(event) =>
                          setRuleType(event.target.value as Rule["ruleType"])
                        }
                      >
                        <option value="forbidden_term">Forbidden term</option>
                        <option value="required_term">Required term</option>
                        <option value="approved_fact">Approved fact</option>
                      </select>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => void addRule()}
                      disabled={busy}
                    >
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
                  <p>See saved reviewer decisions and current session activity.</p>
                </div>
                <span className="neutral-tag">
                  {history.length + decisions.length} events
                </span>
              </section>

              <section className="panel history-panel">
                {history.length === 0 && decisions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">◷</div>
                    <h3>No activity yet</h3>
                    <p>Review a draft or record a reviewer decision.</p>
                    <button
                      className="text-button"
                      onClick={() => setPage("Review")}
                    >
                      Go to content review →
                    </button>
                  </div>
                ) : (
                  <div className="history-list">
                    {decisions.map((decision) => (
                      <div
                        className="history-entry"
                        key={`decision-${decision.id}`}
                      >
                        <span className="history-marker">✓</span>
                        <div>
                          <p>
                            Draft #{decision.draft_id}: {decision.decision}
                          </p>
                          <span>
                            {decision.reviewer ?? "Reviewer"}{" "}
                            {decision.comments ? `— ${decision.comments}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}

                    {history.map((entry, index) => (
                      <div className="history-entry" key={`${entry}-${index}`}>
                        <span className="history-marker">✓</span>
                        <div>
                          <p>{entry}</p>
                          <span>Session activity</span>
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