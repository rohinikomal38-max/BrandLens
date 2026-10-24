const API_BASE_URL = "https://brandlens-backend.onrender.com";

export type ApiFinding = {
  id?: number;
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

export type ReviewResponse = {
  status: string;
  has_issues: boolean;
  findings: ApiFinding[];
};

export type DraftResponse = {
  id: number;
  title: string;
  content: string;
  content_type: string | null;
  status: string;
};

export type BrandRuleResponse = {
  id: number;
  name: string;
  rule_type: string;
  value: string;
  description: string | null;
  is_active: boolean;
};

export type ReviewDecisionResponse = {
  id: number;
  draft_id: number;
  decision: string;
  reviewer: string | null;
  comments: string | null;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `API error ${response.status}: ${errorBody || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export function createDraft(
  title: string,
  content: string,
  contentType: string,
) {
  return request<DraftResponse>("/api/drafts/", {
    method: "POST",
    body: JSON.stringify({
      title,
      content,
      content_type: contentType,
    }),
  });
}

export function listDrafts() {
  return request<DraftResponse[]>("/api/drafts/");
}

export function getDraft(draftId: number) {
  return request<DraftResponse>(`/api/drafts/${draftId}`);
}

export function listBrandRules() {
  return request<BrandRuleResponse[]>("/api/rules/");
}

export function createBrandRule(rule: {
  name: string;
  rule_type: "forbidden_term" | "required_term" | "approved_fact";
  value: string;
  description?: string;
}) {
  return request<BrandRuleResponse>("/api/rules/", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export function reviewContent(draftId: number, text: string) {
  return request<ReviewResponse>("/api/review", {
    method: "POST",
    body: JSON.stringify({
      draft_id: draftId,
      text,
    }),
  });
}

export function getDraftFindings(draftId: number) {
  return request<{
    draft_id: number;
    total_findings: number;
    findings: ApiFinding[];
  }>(`/api/drafts/${draftId}/findings`);
}

export function saveReviewDecision(
  draftId: number,
  decision: "approved" | "changes_requested",
  reviewer: string,
  comments: string,
) {
  return request<ReviewDecisionResponse>(
    `/api/drafts/${draftId}/decisions`,
    {
      method: "POST",
      body: JSON.stringify({
        decision,
        reviewer,
        comments,
      }),
    },
  );
}

export function getReviewDecisions(draftId: number) {
  return request<ReviewDecisionResponse[]>(
    `/api/drafts/${draftId}/decisions`,
  );
}
export function getAllReviewDecisions() {
  return request<ReviewDecisionResponse[]>("/api/decisions/");
}
