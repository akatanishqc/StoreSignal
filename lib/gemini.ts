import { StoreData } from "./shopify";

// Top-level TypeScript interfaces
export interface ProductAudit {
  productId: string;
  productTitle: string;
  totalScore: number;
  dimensions: {
    descriptionClarity: number;
    searchability: number;
    trustSignals: number;
    aiAnswerability: number;
    completeness: number;
  };
  gaps: string[];
  suggestedRewrite: string;
  priorityLevel: "critical" | "needs-work" | "good";
}

export interface PolicyAudit {
  totalScore: number;
  dimensions: {
    returnPolicyClarity: number;
    shippingInformation: number;
    faqCoverage: number;
    trustCredibility: number;
  };
  gaps: string[];
  recommendations: string[];
}

export interface StoreAuditReport {
  storeName: string;
  overallScore: number;
  aiReadinessLevel: "Not Ready" | "Needs Work" | "Almost There" | "AI Ready";
  productAudits: ProductAudit[];
  policyAudit: PolicyAudit | null;
  topPriorities: string[];
  summary: string;
}

// Simple utility to ensure numbers are in 0-100
function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// If no policies exist, return a structured fallback per user request
function policyFallback(): PolicyAudit {
  return {
    totalScore: 0,
    dimensions: {
      returnPolicyClarity: 0,
      shippingInformation: 0,
      faqCoverage: 0,
      trustCredibility: 0,
    },
    gaps: [
      "No refund policy configured",
      "No shipping policy configured",
      "No privacy policy configured",
      "No terms of service configured",
    ],
    recommendations: [
      "Add a refund policy in Shopify Admin → Settings → Policies",
      "Add a shipping policy explaining delivery timelines and costs",
      "Add a privacy policy (required for GDPR compliance)",
      "Add terms of service to build buyer trust",
    ],
  };
}

function stripHtml(input: string | null | undefined) {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Clean policy text for LLM: strip HTML, Liquid tags, collapse whitespace, limit length
function cleanPolicy(body: string | null | undefined) {
  if (!body) return "[NOT CONFIGURED]";
  return String(body)
    .replace(/<[^>]*>/g, " ")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\{%[^%]*%\}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

async function callGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 8192,
    }),
  });

  const payload = await res.json();
  const content =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.text ??
    null;
  if (!content) throw new Error("No content from Groq");
  // strip markdown fences if present
  const cleaned = String(content)
    .replace(/```json\s*|```/g, "")
    .trim();
  return cleaned;
}

// Helper to chunk array into batches
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Main analyzer: creates a simple batched product audit and policy audit/fallback
export async function analyzeStore(
  store: StoreData,
): Promise<StoreAuditReport> {
  // Attempt to call Groq for batched product audits. If Groq fails, fall back to heuristics.
  const rawProducts = (store.products || []).map((p) => ({
    id: p.id,
    title: p.title,
    description: stripHtml(p.descriptionHtml).slice(0, 1500),
    tags: (p.tags || []).slice(0, 10),
    images: (p.images || []).length,
    variants: (p.variants || []).length,
    seo: p.seo?.description || p.seo?.title || "",
  }));

  let productAudits: ProductAudit[] = [];

  if (rawProducts.length > 0) {
    // Split products into batches of 5 to avoid token saturation
    const productBatches = chunkArray(rawProducts, 5);

    try {
      const clampProduct = (n: any) =>
        Math.min(20, Math.max(0, Math.round(Number(n) || 0)));

      // Process each batch
      for (
        let batchIndex = 0;
        batchIndex < productBatches.length;
        batchIndex++
      ) {
        const batch = productBatches[batchIndex];

        const productPrompt = `Analyze the following products and return a JSON object named \"productAudits\" which is an array of audits matching this shape: { productId, productTitle, dimensions: { descriptionClarity, searchability, trustSignals, aiAnswerability, completeness }, gaps: [string], suggestedRewrite: string, priorityLevel: string, totalScore: number }.

CRITICAL SCORING RULE: Scores and gaps must be consistent. If a gap mentions a dimension problem, that dimension MUST have a low score:
- If description is missing or vague → descriptionClarity must be 0-5
- If no tags or SEO data → searchability must be 0-5
- If missing specs/variants/reviews → trustSignals 0-8
- If AI cannot answer basic questions → aiAnswerability 0-8
- If fields are missing → completeness 0-8
Never give a high score to a dimension that has a gap.

Each dimension is 0-20. totalScore MUST equal the sum of all 5 dimensions. Total is 0-100.

Return only valid JSON with a top-level object { \"productAudits\": [...] }.

PRODUCTS:
${JSON.stringify(batch)}
`;

        const raw = await callGroq(productPrompt);
        const parsed = JSON.parse(raw);
        const audits = parsed?.productAudits ?? parsed?.audits ?? null;
        if (!audits || !Array.isArray(audits))
          throw new Error(
            `Invalid product audits from Groq for batch ${batchIndex}`,
          );

        // Map and normalize each audit in this batch
        const batchAudits = audits.map((a: any) => {
          const dims = a.dimensions || {};
          let d = {
            descriptionClarity: clampProduct(dims.descriptionClarity),
            searchability: clampProduct(dims.searchability),
            trustSignals: clampProduct(dims.trustSignals),
            aiAnswerability: clampProduct(dims.aiAnswerability),
            completeness: clampProduct(dims.completeness),
          };

          // Detect scale and normalize to 0-20
          const maxDimValue = Math.max(...Object.values(d));
          if (maxDimValue <= 10) {
            // Groq used 0-10 scale, multiply by 2 to get 0-20
            (Object.keys(d) as Array<keyof typeof d>).forEach((key) => {
              d[key] = Math.min(20, d[key] * 2);
            });
          } else if (maxDimValue > 20) {
            // Groq used 0-100 scale, divide by 5 to get 0-20
            (Object.keys(d) as Array<keyof typeof d>).forEach((key) => {
              d[key] = Math.round(d[key] / 5);
            });
          }

          const totalScore = Object.values(d).reduce((s, v) => s + v, 0);
          const priority: ProductAudit["priorityLevel"] =
            totalScore < 40
              ? "critical"
              : totalScore < 70
                ? "needs-work"
                : "good";
          return {
            productId: a.productId || a.id || "",
            productTitle: a.productTitle || a.title || "",
            dimensions: d,
            gaps: Array.isArray(a.gaps) ? a.gaps : [],
            suggestedRewrite: a.suggestedRewrite || "",
            priorityLevel: priority,
            totalScore,
          } as ProductAudit;
        });

        productAudits.push(...batchAudits);

        // Add 300ms delay between batch calls (except after last batch)
        if (batchIndex < productBatches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      // fallback heuristics: process all products locally
      productAudits = (store.products || []).map((p) => {
        const title = p.title || "Untitled Product";
        const descriptionLength = (p.descriptionHtml || "").length;
        const hasImages = (p.images || []).length > 0;

        const descriptionClarity = Math.min(
          20,
          descriptionLength > 300 ? 18 : descriptionLength > 100 ? 12 : 4,
        );
        const searchability = Math.min(20, title.length > 0 ? 10 : 2);
        const trustSignals = Math.min(20, hasImages ? 10 : 2);
        const aiAnswerability = Math.min(20, descriptionLength > 0 ? 10 : 2);
        const completeness = Math.min(
          20,
          Math.round((descriptionClarity + trustSignals + aiAnswerability) / 3),
        );
        const totalScore =
          descriptionClarity +
          searchability +
          trustSignals +
          aiAnswerability +
          completeness;
        const gaps: string[] = [];
        if (descriptionClarity < 10)
          gaps.push("Improve product description clarity and detail.");
        if (trustSignals < 8)
          gaps.push("Add high-quality images and trust badges.");
        if (searchability < 8)
          gaps.push("Improve product title and metadata for search.");
        const priorityLevel: ProductAudit["priorityLevel"] =
          totalScore < 40
            ? "critical"
            : totalScore < 70
              ? "needs-work"
              : "good";
        return {
          productId: p.id || "",
          productTitle: title,
          totalScore,
          dimensions: {
            descriptionClarity,
            searchability,
            trustSignals,
            aiAnswerability,
            completeness,
          },
          gaps,
          suggestedRewrite: "",
          priorityLevel,
        };
      });
    }
  } else {
    productAudits = [];
  }

  // Policy audit: if no policies present, return explicit fallback
  const policiesObj = store.policies || {};
  const policyValues = Object.values(policiesObj).filter(Boolean) as Array<any>;
  const allPoliciesMissing =
    policyValues.length === 0 ||
    policyValues.every((p) => !p || Object.keys(p).length === 0);

  let policyAudit: PolicyAudit;

  if (allPoliciesMissing) {
    policyAudit = policyFallback();
  } else {
    // Build prompt using cleaned policy bodies to avoid HTML/Liquid/token issues
    const refundText = cleanPolicy(
      policiesObj.refundPolicy && policiesObj.refundPolicy.body,
    );
    const shippingText = cleanPolicy(
      policiesObj.shippingPolicy && policiesObj.shippingPolicy.body,
    );
    const privacyText = cleanPolicy(
      policiesObj.privacyPolicy && policiesObj.privacyPolicy.body,
    );
    const termsText = cleanPolicy(
      policiesObj.termsOfService && policiesObj.termsOfService.body,
    );

    const prompt = `You are analyzing a Shopify store's policies. For each field below, provide a JSON object named "policyAudit" with the following shape: {"dimensions": {"returnPolicyClarity": number, "shippingInformation": number, "faqCoverage": number, "trustCredibility": number}, "gaps": [string], "recommendations": [string] }.
Score each dimension from 0 to 25 (maximum 25 each, total maximum 100). Do not exceed 25 for any dimension.

Return only valid JSON.

REFUND POLICY:
${refundText}

SHIPPING POLICY:
${shippingText}

PRIVACY POLICY:
${privacyText}

TERMS OF SERVICE:
${termsText}
`;

    try {
      const raw = await callGroq(prompt);
      const parsed = JSON.parse(raw);
      const dims =
        parsed?.policyAudit?.dimensions ?? parsed?.dimensions ?? null;
      const gaps = parsed?.policyAudit?.gaps ?? parsed?.gaps ?? [];
      const recommendations =
        parsed?.policyAudit?.recommendations ?? parsed?.recommendations ?? [];

      const clamp25 = (n: any) => {
        const num = Number(n) || 0;
        return Math.min(25, Math.max(0, Math.round(num)));
      };

      if (!dims) throw new Error("Missing dimensions in Groq response");

      policyAudit = {
        dimensions: {
          returnPolicyClarity: clamp25(dims.returnPolicyClarity),
          shippingInformation: clamp25(dims.shippingInformation),
          faqCoverage: clamp25(dims.faqCoverage),
          trustCredibility: clamp25(dims.trustCredibility),
        },
        gaps: Array.isArray(gaps) ? gaps : [],
        recommendations: Array.isArray(recommendations) ? recommendations : [],
        totalScore: 0,
      };

      policyAudit.totalScore = Object.values(policyAudit.dimensions).reduce(
        (a, b) => a + b,
        0,
      );
    } catch (err) {
      // Defensive fallback: return structured fallback but list real missing policy gaps
      policyAudit = policyFallback();

      const missing: string[] = [];
      if (!policiesObj.refundPolicy || !policiesObj.refundPolicy.body)
        missing.push("No refund policy configured");
      if (!policiesObj.shippingPolicy || !policiesObj.shippingPolicy.body)
        missing.push("No shipping policy configured");
      if (!policiesObj.privacyPolicy || !policiesObj.privacyPolicy.body)
        missing.push("No privacy policy configured");
      if (!policiesObj.termsOfService || !policiesObj.termsOfService.body)
        missing.push("No terms of service configured");

      if (missing.length > 0) {
        policyAudit.gaps = missing;
      } else {
        // All policies present but LLM failed — note analysis failure
        policyAudit.gaps.unshift(
          "Policy analysis failed: LLM call failed or returned invalid JSON",
        );
      }
    }
  }

  const overallScore = productAudits.length
    ? Math.round(
        productAudits.reduce((s, p) => s + p.totalScore, 0) /
          productAudits.length,
      )
    : policyAudit.totalScore;

  const report: StoreAuditReport = {
    storeName: store.shop?.name || store.shop?.primaryDomain?.url || "Store",
    overallScore: clamp(overallScore),
    aiReadinessLevel:
      overallScore >= 80
        ? "AI Ready"
        : overallScore >= 60
          ? "Almost There"
          : overallScore >= 30
            ? "Needs Work"
            : "Not Ready",
    productAudits,
    policyAudit: policyAudit || null,
    topPriorities: productAudits
      .slice(0, 3)
      .map(
        (p) => `${p.productTitle} — ${p.gaps[0] || "Improve product content"}`,
      ),
    summary: `Generated ${productAudits.length} product audits, policy audit ${allPoliciesMissing ? "fallback" : "present"}.`,
  };

  return report;
}

export default analyzeStore;
