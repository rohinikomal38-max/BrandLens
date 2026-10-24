# BrandLens — Intelligent Brand-Governance Platform

BrandLens is a brand-governance platform that helps teams review marketing content against approved brand guidelines before publication. It identifies potentially problematic wording, explains flagged issues, suggests improvements, and supports a structured human approval workflow.

**Project status:** Frontend prototype in development.

## 🚀 Live Demo

**Try BrandLens live:** [Open BrandLens](https://brand-lens-seven.vercel.app)

- **Frontend:** https://brand-lens-seven.vercel.app
- **Backend API:** https://brandlens-backend.onrender.com
- **API Documentation:** https://brandlens-backend.onrender.com/docs
- **Health Check:** https://brandlens-backend.onrender.com/health

BrandLens helps teams review content against brand guidelines and manage brand-governance decisions through a web-based platform.

## Problem Statement

Marketing teams must maintain consistent terminology, accurate claims, and approved messaging across different channels. Manual content reviews can be time-consuming, inconsistent, and difficult to track.

Teams need a centralized way to detect brand-related issues, understand why content needs revision, and manage review decisions before publication.

## Our Solution

BrandLens provides a centralized workspace for reviewing marketing drafts against configured brand rules.

The platform follows a structured workflow:

1. **Submit Content:** A user enters a marketing draft and selects its content type.
2. **Check Brand Rules:** The review engine checks the draft against configured rules, restricted claims, and approved terminology.
3. **Identify Issues:** BrandLens highlights potentially problematic phrases and explains why they may violate a rule.
4. **Suggest Improvements:** The platform proposes alternative wording that the reviewer can evaluate and apply.
5. **Human Review:** A reviewer adds comments and either approves the draft or requests changes.
6. **Track Decisions:** Review activity and decisions are recorded to support accountability and traceability.

### What Makes BrandLens Valuable?

- **Consistency:** Helps teams apply brand guidelines consistently.
- **Explainability:** Shows flagged phrases and the reasons behind findings.
- **Human Control:** Keeps final approval with a human reviewer.
- **Traceability:** Organizes review activity and decision history.
- **Extensibility:** Can integrate with backend services and validated AI-assisted review as development progresses.

BrandLens is designed to assist reviewers, not replace their judgment or publish content automatically.

## Key Features

- Marketing draft editor and content-type selection
- Rule-based content review
- Highlighted findings with explanations
- Suggested wording replacements
- Brand-rule management interface
- Reviewer comments and approval decisions
- Review activity history

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Planned Backend
- Python
- FastAPI
- SQLite, with PostgreSQL as a possible future option

### Review Engine
- Deterministic brand-rule checks
- Optional AI-assisted review, subject to implementation and validation

## Project Structure

```text
BrandLens/
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Run the Frontend

Clone the repository:

```bash
git clone https://github.com/rohinikomal38-max/BrandLens.git
cd BrandLens
```

Install the dependencies:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually `http://localhost:5173/`.

## Current Implementation Status

The frontend prototype is being developed with local demo data and browser-side state.

Implemented prototype functionality includes:
- Draft editing and content-type selection
- Local rule-based phrase checks
- Findings and suggested replacements
- Brand-rule management interface
- Human review actions
- Session-only review activity history

Backend integration, persistent data storage, and AI-assisted review are planned enhancements and are not yet claimed as completed features.

## Team Responsibilities

- **Rachna Garg:** Product direction, backend API, integration, data storage, and deployment.
- **Rohini Komal:** Frontend interface, draft-review workflow, suggested edits, and reviewer experience.
- **Lucky:** Review-engine logic, brand-rule checks, explanations, and testing.

## Project Principles

- Keep findings understandable and explainable.
- Keep final content approval with a human reviewer.
- Never publish content automatically.
- Protect sensitive content and configuration data.
- Clearly distinguish implemented capabilities from planned features.

## Roadmap

- [x] Set up the React + TypeScript frontend
- [ ] Verify the complete frontend review workflow
- [ ] Connect the frontend to the backend API
- [ ] Persist rules, findings, and review decisions
- [ ] Implement and validate AI-assisted review
- [ ] Expand automated testing
- [ ] Deploy the integrated application


## License

No license has been selected for this repository yet.
