# StoreSignal

**AI Representation Optimizer for Shopify stores.**

Built by [Tanishq Choudhury](https://www.tanishqsolves.me/)

---

## What It Does

StoreSignal connects to any Shopify store via the Admin API and analyzes how AI shopping agents perceive your products and policies. Using Groq-powered LLM analysis, it scores each product across five critical dimensions: Description Clarity, Searchability, Trust Signals, AI Answerability, and Completeness. The result is a full audit report with actionable gaps, suggested rewrites, and an exportable markdown summary — helping you optimize your store's representation for AI-first commerce.

---

## Problem Statement

**Kasparro Hackathon Track 5 — AI Representation Optimizer**

When AI shopping agents recommend products, they pull from store data. Incomplete or ambiguous product descriptions, missing policies, poor metadata, and inconsistent information cause agents to skip or misrepresent products. This damages customer trust and reduces conversion rates.

StoreSignal makes this problem visible and actionable — surfacing exactly what's broken in your store's AI representation before a customer-facing agent encounters it.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **LLM Analysis**: Groq API (Llama 3.3 70B Versatile)
- **Data Source**: Shopify Admin API (GraphQL + REST)
- **Deployment**: Firebase Hosting (frontend) + Render (API routes)

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- A Shopify Partner account with a development store
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### Installation

```bash
git clone https://github.com/akatanishqc/StoreSignal.git
cd StoreSignal
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```
GROQ_API_KEY=your_groq_api_key_here
```

(Shopify store credentials are entered by the user in the StoreSignal UI.)

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Connecting Your Shopify Store

1. Go to [partners.shopify.com](https://partners.shopify.com) and create a Partner account
2. Create a development store
3. Navigate to **Settings → Apps and integrations → Develop apps → Create an app**
4. Name your app "StoreSignal"
5. Under **Admin API scopes**, enable:
   - `read_products`
   - `read_content`
   - `read_metafields`
   - `read_orders`
   - `read_legal_policies`
6. Click **Save** and then **Install app**
7. Copy the **Admin API access token** from the credentials page
8. In StoreSignal, enter:
   - **Store Domain**: `yourstore-zj1234ab.myshopify.com`
   - **Access Token**: (the token you just copied)
9. Click **Fetch Store** to load your products, then **Run AI Analysis** to generate the audit report

---

## Submission Checklist

- [x] Product Document (see `/docs/PRODUCT.md`)
- [x] Technical Document (see `/docs/TECHNICAL.md`)
- [x] Working code in public GitHub repo
- [x] Demo video (link below)
- [x] README with setup instructions
- [x] Contribution note (solo project)
- [x] Decision log (see `WORKLOG.md`)

---

## Demo Video

[Add YouTube/Drive link here]

---

## Contribution Note

**Solo project by Tanishq Choudhury.**

- Product thinking, engineering, and documentation: 100% solo
- AI coding tools used: Claude (progress strategy)
- All architectural decisions, prompts, and debug cycles documented in `WORKLOG.md`

---

## License

MIT
