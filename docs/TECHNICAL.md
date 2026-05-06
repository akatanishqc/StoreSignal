# StoreSignal — Technical Document

## System Architecture

Components:

- Frontend: Next.js 14 (App Router, TypeScript, Tailwind)
  Hosted on Firebase Hosting
- API Layer: Next.js API routes (`/api/fetch-store`, `/api/analyze-store`)
  Hosted on Render (free tier)
- AI Layer: Groq API (Llama 3.3 70B Versatile)
  Single batched call per analysis run
- Data Source: Shopify Admin API
  GraphQL for products/pages, REST for policies

Data flow:

1. User submits domain + token in browser
2. `/api/fetch-store` calls Shopify GraphQL + REST
3. Raw store data returned to frontend
4. User triggers `/api/analyze-store`
5. API builds a single prompt with all store data
6. Groq returns structured JSON audit report
7. Frontend renders dashboard from report
8. User can export report as markdown

## Key Implementation Decisions

### AI/Deterministic Boundary

What the AI does:

- Scores product dimensions (judgment call)
- Identifies gaps (pattern recognition)
- Generates suggested rewrites (creative)
- Synthesizes top priorities (ranking)

What deterministic code handles:

- All Shopify API calls (no AI involved)
- Score normalization and clamping
- JSON parsing and validation
- Report export formatting
- Error state handling

### Single Batched Groq Call

All products are sent in one Groq call. Reasoning: per-product calls quickly exhausted the free tier and caused 429s; a single batched call reduces API usage to two calls per run (products + policies). Tradeoff: if Groq returns malformed or partial JSON, the entire batch can fail; mitigations are robust parsing, fallback heuristics, and retry guidance.

### Score Normalization

Groq responses showed inconsistent scales (0–10, 0–20, 0–100). Implemented deterministic normalization post-parse:

- Compute max dimension value across returned dimensions.
- If max ≤ 10 → multiply all dims by 2 (0–10 → 0–20).
- If max > 20 → divide all dims by 5 (0–100 → 0–20).
- Clamp each dimension to [0,20] and recompute `totalScore` as the sum.
  This keeps UI rendering stable and preserves relative differences.

## Failure Handling

### Shopify API Down

- `/api/fetch-store` returns an error object with the upstream message.
- Frontend shows a clear "Connection failed" state and allows retry without full page reload.
- Server logs error details for debugging (not persisted in production by default).

### Groq Returns Malformed JSON

- Strip Markdown fences and leading/trailing text before parsing.
- Wrap `JSON.parse` in try/catch.
- On parse failure: mark affected products with score 0 and gap `"Analysis unavailable — retry"`, surface an actionable retry button in the UI.
- Where possible, attempt a secondary, lenient parse that extracts partial product arrays.

### Groq Rate Limited (429)

- Primary mitigation: single batched call significantly reduces call volume.
- If 429 occurs, surface a clear retry error and suggest a timed backoff (user-visible guidance).
- For heavy usage, recommend an API key rotation or paid quota.

### Empty Policy Data

- Detect all-null policy payloads before calling Groq.
- If empty: return a structured zero-score `PolicyAudit` with gap recommendations (e.g., "No refund policy configured") without consuming Groq quota.
- UI displays a yellow warning banner explaining missing policies and next steps.

### Invalid Shopify Credentials

- GraphQL returns 401/403; `/api/fetch-store` maps these to explicit messages.
- Frontend shows the message and a short checklist (correct domain format, token scopes).

## Known Limitations

1. Score variability: LLM outputs are non-deterministic. StoreSignal is designed to surface trends and actionable gaps rather than exact repeatable scores.
2. Product count limit: GraphQL queries fetch up to 50 products; pagination is not implemented. Suitable for small–medium stores; production should implement cursor-based paging and incremental analysis.
3. No persistent storage: results live in client state; refresh clears the report. Production requires a database and encrypted credential storage.
4. Image analysis omitted: assessing image quality requires vision models and increases cost.
5. Single-session credentials: Admin API tokens are entered per session and not stored server-side.

## What We Would Improve With More Time

- Full Shopify OAuth app flow and secure credential storage.
- Persistent report storage, history, and diffing across runs.
- Streaming analysis with per-product progress and partial results.
- Robust schema validation for Groq responses (JSON Schema + strict rejection paths).
- Add pagination and background processing for large catalogs (500+ products).
- Add optional image-quality scoring using a vision model and integrate with product rewrite suggestions.
