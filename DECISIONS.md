# StoreSignal — Decision Log

> A running log of key decisions made during the build, the reasoning behind each, and tradeoffs considered.
> Built for Kasparro Agentic Commerce Hackathon, Track 5.

---

## Architecture Decisions

### AI Provider: Groq (Llama 3.3 70B Versatile)

**Decision:** Use Groq API instead of Gemini or OpenAI

**Reasoning:** Free tier with 14,400 req/day, reliable uptime, OpenAI-compatible format, fast inference for structured JSON analysis

**Tradeoff:** Less brand recognition than GPT-4, but performance is sufficient for structured JSON analysis at scale

---

### Single Batched AI Call vs Per-Product Calls

**Decision:** Send all products in one Groq call

**Reasoning:** 17 separate calls exhausted free tier quota instantly. Single call = 2 total API calls per analysis run (products + policies)

**Tradeoff:** Slightly less granular error recovery per product, but dramatically more reliable and cost-effective

---

### Shopify Auth: API Key Input vs OAuth

**Decision:** Admin API key input in UI

**Reasoning:** Full OAuth requires Shopify app review and a public app listing — outside hackathon scope. This approach signals "developer tool" not "consumer app"

**Tradeoff:** Less seamless UX than one-click install, but correct for a diagnostic tool at this stage

**Production path:** OAuth via Shopify App Store for production deployment

---

### Policy Data: REST API vs GraphQL

**Decision:** Use REST `/policies.json` endpoint

**Reasoning:** Shopify GraphQL Admin API does not expose shop policies — discovered after multiple failed attempts. REST endpoint required

**Tradeoff:** Mixed REST + GraphQL in one codebase, but necessary given Shopify's API design

---

### Synthetic Data: Not Used

**Decision:** Use real Shopify Admin API with development store

**Reasoning:** Judges are commerce infrastructure engineers. Real API integration signals builder credibility over mock data

**Tradeoff:** More setup complexity for the demo, but authenticity is critical for a hackathon submission

---

## Scope Decisions (What We Did NOT Build)

### No User Accounts / Auth Persistence

Credentials entered per session. Account persistence and multi-user support is unnecessary complexity for a diagnostic tool at this stage.

### No Image Analysis

Product images not sent to AI. Text and metadata analysis covers the core value proposition. Image analysis would require vision models and significantly increase operational cost.

### No Real-time Monitoring

Point-in-time audit only. Continuous monitoring and alerts are natural V2 features but outside hackathon scope.

### No Multi-store Comparison

Single store analysis keeps the product focused and feasible. Multi-store benchmarking is a natural enterprise feature for later.

---

## Technical Decisions

### Next.js 14 App Router

Familiar stack (used on prior projects), good for full-stack in one repo, straightforward deployment on Render + Firebase.

### Dynamic Dimension Scale Normalization

**Problem:** Groq returns inconsistent dimension scores — sometimes 0-10, sometimes 0-20, sometimes 0-100 depending on prompt interpretation

**Solution:** Added dynamic detection after JSON parse. Max dimension value ≤10 → multiply by 2. Max >20 → divide by 5. Else keep as-is. Always normalize to 0-20 range.

**Result:** Consistent UI rendering and score interpretation across all Groq response variations

### ESLint Pinned to v8

Next.js 14 has a peer dependency conflict with ESLint 9. Pinned to `^8.57.0` in package.json to resolve and stabilize the build.

### Splash Screen with Sequential Arc Animation

**Decision:** Add a 2.4-second splash screen on app load with sequential signal arc animations

**Reasoning:**

- Creates a professional first impression and signals "AI-native tool"
- Uses the app's existing design tokens (--accent-green, Syne, JetBrains Mono) for visual consistency
- Sequential animations (dot → Arc 1 → Arc 2 → Arc 3 → wordmark → tagline) create rhythm and engagement
- CSS-only animations (no library dependencies) keep bundle size small

**Implementation:**

- SplashScreen.tsx component uses SVG concentric arcs with stroke-dasharray animation
- Loading bar animates full-width over 1.8s while arcs appear
- Fades out at 2000ms, unmounts at 2400ms
- All timing via setTimeout; state controls fade transition
- onComplete callback removes splash from DOM

---

## What Worked Well

- **Groq API:** Reliable, fast, free tier sufficient for this workload
- **Single batched call:** Dramatically reduced API quota pressure
- **Tailwind CSS:** Rapid UI development with custom CSS variables for theming
- **TypeScript + App Router:** Type safety and file-based routing kept code organized

---

## Known Limitations & Future Work

1. **Dimension scale detection:** Works well for typical responses but could be more robust with explicit Groq schema validation
2. **Policy HTML parsing:** Simple regex strip — could use a proper HTML parser for edge cases
3. **Error messaging:** Could be more granular (e.g., specific Shopify API errors back to user)
4. **Performance:** All products analyzed in one pass — could add pagination for stores with 500+ products

---

## Submission Artifacts

- **GitHub:** https://github.com/akatanishqc/StoreSignal
- **Live Demo:** [Add link]
- **Product Doc:** `/docs/PRODUCT.md`
- **Technical Doc:** `/docs/TECHNICAL.md`
- **Deployment:** Deployed on Render as a single Node.js web service instead of Firebase+Render split — simpler architecture, Next.js API routes need a Node.js server

---

## Change Log

- 2026-05-06: Fixed splash arc animation with correct stroke-dasharray lengths and smoother cubic-bezier timing.
- 2026-05-06: Removed hackathon reference from landing page feature cards; replaced with "ZERO LATENCY" messaging.
- 2026-05-06: Removed debug console.log statements from production code; retained console.error for real errors.
- 2026-05-06: Fixed policy text cleaning — strip HTML and Liquid tags before sending to Groq.
- 2026-05-06: Fixed policy dimension label casing in the Policy Audit UI and exports.
- 2026-05-06: Fixed undefined truncate() function — replaced with cleanPolicy() helper.
