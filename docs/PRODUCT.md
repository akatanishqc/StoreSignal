# StoreSignal — Product Document

## The Problem

When AI shopping agents recommend products, they pull from store data: descriptions, tags, policies, SEO fields, and variant information. If that data is incomplete, vague, or missing, the agent either skips the product or misrepresents it to the buyer. Most Shopify merchants have no visibility into how AI agents perceive their store. Merchants optimize for human browsers, not AI-driven commerce, and this gap will widen as agentic shopping becomes the default.

## Who This Is For

Primary user: Shopify merchants who want their store to perform well in AI-driven commerce channels (Google AI Mode, ChatGPT shopping, Shopify Agentic Plan). Current experience: merchants lack a diagnostic tool for AI readiness and therefore cannot reliably know why AI agents omit or misrepresent listings.

## What We Built

StoreSignal connects to a Shopify store via the Admin API, fetches products, variants, SEO fields, policies, and metadata, then runs a simulated AI-agent analysis to evaluate how an agent would interpret each listing. The core user journey:

1. Merchant enters their store domain and Admin API token.
2. StoreSignal fetches product data and shop policies.
3. An AI analysis scores each product across five dimensions.
4. The dashboard highlights scores, per-product gaps, and suggested rewrites.
5. Merchant exports a full audit report as markdown for actioning or sharing.

## Key Product Decisions

### What we scored (and why)

We score five dimensions per product because each directly affects an AI agent's ability to find, understand, and confidently recommend a listing:

- Description Clarity: can an AI extract concrete facts needed to answer buyer questions?
- Searchability: do tags and SEO fields support intent matching and retrieval?
- Trust Signals: does the listing include the details an agent needs to recommend purchase confidently?
- AI Answerability: can the AI answer common buyer questions using only the listing?
- Completeness: are required fields present and populated for the agent to use?

### What we chose NOT to score

- Customer reviews: not available via standard Admin API without third-party apps.
- Image quality: requires vision models and higher costs for marginal AI-readiness gains.
- Pricing strategy: subjective and not a direct AI-readiness signal.

### Why single-session credentials (no OAuth)

Full Shopify OAuth requires app review and a public app listing, which is outside hackathon scope. Using an Admin API key entered per session is a standard developer-tool pattern and reduces integration friction for demos. Production path: migrate to OAuth via the Shopify App Store.

### Why not synthetic data

Judges are commerce infrastructure engineers. Real API integration demonstrates practical understanding and credibility. A synthetic-data fallback is documented but not the primary mode.

## Tradeoffs

| Decision     | Chosen              | Alternative       | Reason                                                              |
| ------------ | ------------------- | ----------------- | ------------------------------------------------------------------- |
| AI provider  | Groq (free)         | OpenAI            | Zero cost and sufficient quality for structured JSON analysis       |
| Auth         | API key input       | OAuth flow        | OAuth is out of scope for a hackathon; API key is simpler for demos |
| Analysis     | Batched single call | Per-product calls | Batched calls reduce quota usage and improve reliability            |
| Policy fetch | REST API            | GraphQL           | GraphQL does not expose policies; REST is the only practical source |
| Data         | Real Shopify API    | Synthetic         | Real integration signals credibility to judges                      |

## What Good Looks Like

A merchant runs StoreSignal and immediately sees:

- Which products are effectively invisible to AI agents and why.
- A concise list of specific gaps per product to fix.
- A suggested rewrite for each listing that addresses the gaps.
- Which legal and shipping policies are missing or insufficient.
- An exportable, markdown audit report that can be shared with the team.
