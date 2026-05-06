"use client";

import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import type { StoreData } from "@/lib/shopify";
import type { StoreAuditReport, ProductAudit, PolicyAudit } from "@/lib/gemini";

type FetchState = "idle" | "loading" | "success" | "error";

function PlugIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v6" />
      <path d="M16 2v6" />
      <path d="M6 8h12" />
      <path d="M10 8v5a2 2 0 0 0 2 2v7" />
      <path d="M14 8v5a2 2 0 0 1-2 2v7" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h4" />
      <path d="M16 7h4" />
      <path d="M4 17h4" />
      <path d="M16 17h4" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-4" />
    </svg>
  );
}

function DimensionBar({
  label,
  score,
  max = 100,
}: {
  label: string;
  score: number;
  max?: number;
}) {
  const getScoreColor = (s: number) => {
    if (s < 40) return "#FF4444";
    if (s < 70) return "#FF8C00";
    return "#00FF87";
  };

  const percentage = Math.min(100, (score / max) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-primary)] font-mono-ui">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="relative">
        <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="absolute left-0 top-0 h-1.5 rounded-full"
            style={{
              width: `${Math.min(100, (score / 20) * 100)}%`,
              background: getScoreColor(percentage),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ProductCardComponent({
  product,
  getScoreColor,
}: {
  product: ProductAudit;
  getScoreColor: (score: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const priorityColors: Record<string, string> = {
    critical: "bg-[#2A0F0F] text-[#FF4444] border-[#3A1A1A]",
    "needs-work": "bg-[#2A1F0F] text-[#FF8C00] border-[#3A2A1A]",
    good: "bg-[#0F2A0F] text-[#00FF87] border-[#1A3A1A]",
  };

  const visibleGaps = product.gaps.slice(0, 3);
  const moreGaps = Math.max(0, product.gaps.length - 3);

  return (
    <div className="terminal-panel rounded-[1.2rem] p-5 flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display font-semibold text-[var(--text-primary)] line-clamp-1">
              {product.productTitle}
            </h4>
            <div
              className="flex items-center justify-center w-14 h-14 min-w-[56px] rounded-full text-white text-lg font-bold"
              style={{ backgroundColor: getScoreColor(product.totalScore) }}
            >
              {product.totalScore}
            </div>
          </div>

          <div
            className={`px-3 py-2 rounded-full text-xs font-mono-ui border w-fit uppercase tracking-wider ${priorityColors[product.priorityLevel] || priorityColors.good}`}
          >
            {product.priorityLevel.toUpperCase()}
          </div>

          <div className="space-y-3 mt-3">
            <DimensionBar
              label={
                {
                  descriptionClarity: "Description Clarity",
                }["descriptionClarity"]
              }
              score={product.dimensions.descriptionClarity ?? 0}
              max={20}
            />
            <DimensionBar
              label={
                {
                  searchability: "Searchability",
                }["searchability"]
              }
              score={product.dimensions.searchability ?? 0}
              max={20}
            />
            <DimensionBar
              label={
                {
                  trustSignals: "Trust Signals",
                }["trustSignals"]
              }
              score={product.dimensions.trustSignals ?? 0}
              max={20}
            />
            <DimensionBar
              label={
                {
                  aiAnswerability: "AI Answerability",
                }["aiAnswerability"]
              }
              score={product.dimensions.aiAnswerability ?? 0}
              max={20}
            />
            <DimensionBar
              label={
                {
                  completeness: "Completeness",
                }["completeness"]
              }
              score={product.dimensions.completeness ?? 0}
              max={20}
            />
          </div>

          <div className="space-y-2 mt-3">
            <p className="text-xs text-[var(--text-secondary)] font-mono-ui">
              Gaps
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {visibleGaps.map((gap, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-md text-xs bg-[#2A0F0F] text-[#FF4444] border border-[#3A1A1A] whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ maxWidth: "160px", display: "inline-block" }}
                  title={gap}
                >
                  {gap}
                </span>
              ))}
              {moreGaps > 0 && (
                <span
                  className="px-2 py-1 rounded-md text-xs bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]"
                  style={{ display: "inline-block" }}
                >
                  +{moreGaps} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs font-mono-ui text-[var(--accent-green)] hover:text-white transition-colors border-t border-[var(--border)] pt-3"
          >
            {expanded ? "Hide Suggested Rewrite" : "View Suggested Rewrite"}
          </button>

          {expanded && (
            <div className="space-y-2 mt-3">
              <div className="bg-[#0D0D14] rounded-lg p-4 border border-[var(--border)] text-xs leading-relaxed text-[var(--text-secondary)] font-mono-ui max-h-64 overflow-y-auto">
                {product.suggestedRewrite || "No rewrite suggested"}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(product.suggestedRewrite || "");
                  alert("Copied to clipboard!");
                }}
                className="w-full text-xs py-2 px-3 rounded-lg bg-[rgba(0,255,135,0.1)] text-[var(--accent-green)] border border-[rgba(0,255,135,0.3)] hover:bg-[rgba(0,255,135,0.15)] transition-colors"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<StoreData | null>(null);
  const [auditReport, setAuditReport] = useState<StoreAuditReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/fetch-store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain, token }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: StoreData;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Unable to connect to this store.");
      }

      setResult(payload.data);
      setState("success");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong.",
      );
      setState("error");
    }
  }

  function resetStatus() {
    setState("idle");
    setError("");
    setResult(null);
  }

  function getReadinessBadgeColor(level: string): string {
    switch (level) {
      case "Not Ready":
        return "#FF4444";
      case "Needs Work":
        return "#FF8C00";
      case "Almost There":
        return "#FFD700";
      case "AI Ready":
        return "#00FF87";
      default:
        return "#8888A0";
    }
  }

  function getScoreColor(score: number): string {
    if (score < 40) return "#FF4444";
    if (score < 70) return "#FF8C00";
    return "#00FF87";
  }

  function exportReport() {
    if (!auditReport) return;

    const now = new Date().toLocaleDateString();
    let markdown = `# StoreSignal Audit — ${auditReport.storeName}\n`;
    markdown += `Generated: ${now}\n`;
    markdown += `Score: ${auditReport.overallScore}/100 | ${auditReport.aiReadinessLevel}\n\n`;

    markdown += `## Summary\n${auditReport.summary}\n\n`;

    if (auditReport.topPriorities.length > 0) {
      markdown += `## Top Priorities\n`;
      auditReport.topPriorities.forEach((p) => {
        markdown += `- ${p}\n`;
      });
      markdown += "\n";
    }

    if (auditReport.policyAudit) {
      markdown += `## Policy Audit\n`;
      markdown += `Score: ${auditReport.policyAudit.totalScore}/100\n\n`;
      markdown += `### Dimensions\n`;
      Object.entries(auditReport.policyAudit.dimensions).forEach(([k, v]) => {
        markdown += `- ${k}: ${v}/25\n`;
      });
      if (auditReport.policyAudit.gaps.length > 0) {
        markdown += `\n### Gaps\n`;
        auditReport.policyAudit.gaps.forEach((g) => {
          markdown += `- ${g}\n`;
        });
      }
      if (auditReport.policyAudit.recommendations.length > 0) {
        markdown += `\n### Recommendations\n`;
        auditReport.policyAudit.recommendations.forEach((r) => {
          markdown += `- ${r}\n`;
        });
      }
      markdown += "\n";
    }

    const validProducts = auditReport.productAudits.filter(
      (p) => p.totalScore > 0,
    );
    const sortedProducts = [...validProducts].sort(
      (a, b) => a.totalScore - b.totalScore,
    );

    markdown += `## Product Audits (${sortedProducts.length} products)\n\n`;
    sortedProducts.forEach((p) => {
      markdown += `### ${p.productTitle}\n`;
      markdown += `Score: ${p.totalScore}/100 | ${p.priorityLevel.toUpperCase()}\n\n`;
      markdown += `#### Dimensions\n`;
      Object.entries(p.dimensions).forEach(([k, v]) => {
        markdown += `- ${k}: ${v}\n`;
      });
      if (p.gaps.length > 0) {
        markdown += `\n#### Gaps\n`;
        p.gaps.forEach((g) => {
          markdown += `- ${g}\n`;
        });
      }
      if (p.suggestedRewrite) {
        markdown += `\n#### Suggested Rewrite\n\`\`\`\n${p.suggestedRewrite}\n\`\`\`\n`;
      }
      markdown += "\n";
    });

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storesignal-${auditReport.storeName.replace(/\s+/g, "-").toLowerCase()}-${now.replace(/\//g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (auditReport) {
    const validProducts = auditReport.productAudits.filter(
      (p) => p.totalScore > 0,
    );
    const sortedProducts = [...validProducts].sort(
      (a, b) => a.totalScore - b.totalScore,
    );

    return (
      <main className="relative min-h-screen overflow-hidden px-5 py-6 text-[var(--text-primary)] sm:px-8 lg:px-10 pb-32">
        <div className="scan-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="scan-sweep pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[rgba(0,255,135,0.06)] blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl space-y-10 py-6">
          <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
            <div className="flex items-center gap-3">
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-[var(--accent-green)]" />
              <span className="font-display text-lg font-semibold">
                StoreSignal
              </span>
            </div>
            <button
              onClick={() => setAuditReport(null)}
              className="text-xs font-mono-ui px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Back
            </button>
          </header>

          <section className="space-y-4">
            <h1 className="font-display text-5xl font-bold">
              {auditReport.storeName}
            </h1>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="terminal-panel rounded-[1.4rem] p-4 sm:p-6 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-mono-ui text-[var(--text-secondary)] uppercase tracking-wider">
                      Overall Score
                    </p>
                    <div className="font-mono-ui text-6xl font-bold mt-2">
                      <span
                        className="text-8xl font-extrabold"
                        style={{
                          textShadow: "0 10px 30px rgba(0,255,135,0.08)",
                        }}
                      >
                        {auditReport.overallScore}
                      </span>
                      <span className="text-2xl text-[var(--text-secondary)] ml-3">
                        /100
                      </span>
                    </div>
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg font-display font-bold text-white"
                    style={{
                      backgroundColor: getReadinessBadgeColor(
                        auditReport.aiReadinessLevel,
                      ),
                    }}
                  >
                    {auditReport.aiReadinessLevel}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {auditReport.summary}
                </p>
                <div
                  className="h-2 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${getScoreColor(auditReport.overallScore)} ${auditReport.overallScore}%, var(--border) ${auditReport.overallScore}%)`,
                  }}
                />
              </div>

              {auditReport.topPriorities.length > 0 && (
                <div
                  className="rounded-[1.4rem] p-4 sm:p-6 space-y-3"
                  style={{
                    backgroundColor: "rgba(42, 15, 15, 0.4)",
                    borderColor: "rgba(58, 26, 26, 0.6)",
                    borderWidth: "1px",
                  }}
                >
                  <h3 className="font-display text-lg font-semibold">
                    ⚠ Top Priorities
                  </h3>
                  <ol className="space-y-2 text-sm">
                    {auditReport.topPriorities.map((p, idx) => (
                      <li key={idx} className="text-[var(--text-secondary)]">
                        <span className="text-[#FF4444] font-bold">
                          {idx + 1}.
                        </span>{" "}
                        {p}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>

          {auditReport.policyAudit && (
            <section className="terminal-panel rounded-[1.4rem] p-4 sm:p-6 space-y-4">
              <h2 className="font-display text-2xl font-bold border-l-2 border-[#00FF87] pl-3">
                Policy Audit
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {/* Show a warning banner when policy audit is empty/zeroed */}
                {auditReport.policyAudit.totalScore === 0 &&
                  Object.values(auditReport.policyAudit.dimensions).every(
                    (v) => v === 0,
                  ) && (
                    <div
                      className="col-span-2 rounded-lg p-3"
                      style={{
                        backgroundColor: "#1A1500",
                        border: "1px solid #FFD700",
                        color: "#FFD700",
                      }}
                    >
                      ⚠ No policies are configured for this store. AI shopping
                      agents cannot answer questions about returns, shipping, or
                      store policies — this significantly reduces buyer trust.
                    </div>
                  )}
                {Object.entries(auditReport.policyAudit.dimensions).map(
                  ([key, value]) => {
                    const displayNameMap: Record<string, string> = {
                      returnPolicyClarity: "Return Policy Clarity",
                      shippingInformation: "Shipping Information",
                      faqCoverage: "FAQ Coverage",
                      trustCredibility: "Trust & Credibility",
                    };
                    const display = displayNameMap[key] || key;
                    const pct = Math.min(100, (value / 25) * 100);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">
                            {display}
                          </span>
                          <span className="font-mono-ui">
                            {value}
                            <span className="text-[var(--text-secondary)]">
                              /25
                            </span>
                          </span>
                        </div>

                        <div className="mt-2">
                          <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: getScoreColor(pct),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
              {auditReport.policyAudit.gaps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono-ui text-[var(--text-secondary)]">
                    Gaps
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {auditReport.policyAudit.gaps.map((gap, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 text-xs font-mono-ui bg-[#2A0F0F] text-[#FF4444] rounded-full border border-[#3A1A1A]"
                      >
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {auditReport.policyAudit.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono-ui text-[var(--text-secondary)]">
                    Recommendations
                  </p>
                  <ul className="space-y-1 text-sm">
                    {auditReport.policyAudit.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-[var(--text-secondary)]">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {sortedProducts.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold border-l-2 border-[#00FF87] pl-3">
                Product Audits ({sortedProducts.length})
              </h2>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {sortedProducts.map((product) => (
                  <ProductCardComponent
                    key={product.productId}
                    product={product}
                    getScoreColor={getScoreColor}
                  />
                ))}
              </div>
            </section>
          )}

          {validProducts.length === 0 && (
            <div className="terminal-panel rounded-[1.4rem] p-8 text-center">
              <p className="text-[var(--text-secondary)]">
                No products were successfully analyzed. Please try again or
                check your data.
              </p>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--bg-primary)] px-5 py-4 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <button
              onClick={exportReport}
              className="w-full md:w-auto px-4 py-3 rounded-lg bg-[var(--accent-green)] text-[var(--bg-primary)] font-display font-bold hover:brightness-110 transition-all flex items-center justify-center gap-3"
            >
              <ChartIcon />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalProducts = result?.totals.products ?? 0;
  const totalPages = result?.totals.pages ?? 0;
  const totalVariants = result?.totals.variants ?? 0;

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <main className="relative min-h-screen overflow-hidden px-5 py-6 text-[var(--text-primary)] sm:px-8 lg:px-10">
        <div className="scan-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="scan-sweep pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[rgba(0,255,135,0.06)] blur-3xl" />

        <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border)] pb-5 pt-1">
            <div className="flex items-center gap-3">
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-[var(--accent-green)] shadow-[0_0_16px_rgba(0,255,135,0.9)]" />
              <span className="font-display text-lg font-semibold tracking-[0.08em] sm:text-xl">
                StoreSignal
              </span>
            </div>
            <p className="text-right font-mono-ui text-[0.7rem] uppercase tracking-[0.28em] text-[var(--text-secondary)] sm:text-xs">
              by{" "}
              <a
                href="https://TanishqSolves.me"
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors duration-200 ease-out hover:text-[var(--text-primary)]"
              >
                tanishqsolves.me
              </a>
            </p>
          </header>

          <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:py-12">
            <div className="relative z-10 max-w-3xl animate-fade-up">
              <h1 className="mt-6 max-w-3xl font-display text-5xl font-extrabold leading-[0.96] tracking-[-0.04em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                How Does AI See Your Store?
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                StoreSignal analyzes your Shopify store the way an AI shopping
                agent does — surfacing gaps, misrepresentations, and missed
                opportunities.
              </p>

              <div className="mt-10 grid max-w-2xl gap-4 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
                <div className="terminal-panel rounded-2xl p-4">
                  <p className="font-mono-ui text-[0.72rem] uppercase tracking-[0.24em] text-[var(--text-mono)]">
                    Diagnostic Readiness
                  </p>
                  <p className="mt-2 text-base text-[var(--text-primary)]">
                    Shopify metadata, policies, and product signals
                  </p>
                </div>
                <div className="terminal-panel rounded-2xl p-4">
                  <p className="font-mono-ui text-[0.72rem] uppercase tracking-[0.24em] text-[var(--text-mono)]">
                    Signal Quality
                  </p>
                  <p className="mt-2 text-base text-[var(--text-primary)]">
                    Spot gaps before an AI assistant misreads the store
                  </p>
                </div>
                <div className="terminal-panel rounded-2xl p-4">
                  <p className="font-mono-ui text-[0.72rem] uppercase tracking-[0.24em] text-[var(--text-mono)]">
                    ZERO LATENCY
                  </p>
                  <p className="mt-2 text-base text-[var(--text-primary)]">
                    Real-time analysis powered by free-tier infrastructure with
                    production-grade reliability
                  </p>
                </div>
              </div>
            </div>

            <div
              className="relative z-10 animate-fade-up lg:pl-6"
              style={{ animationDelay: "90ms" }}
            >
              <div className="terminal-panel rounded-[1.75rem] border-[color:var(--accent-green-border)] p-5 shadow-glow sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2rem]">
                      Connect Your Store
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                      Pull live store data through the Shopify Admin API, then
                      hand it off to your AI pipeline.
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--accent-green-border)] bg-[var(--accent-green-dim)] px-3 py-1 font-mono-ui text-[0.68rem] tracking-[0.22em] text-[var(--text-mono)]">
                    LIVE
                  </span>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="domain"
                      className="mb-2 block font-mono-ui text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                    >
                      Shop Domain
                    </label>
                    <input
                      id="domain"
                      className="terminal-input"
                      placeholder="your-store.myshopify.com"
                      value={domain}
                      onChange={(event) => {
                        setDomain(event.target.value);
                        if (state === "error") {
                          resetStatus();
                        }
                      }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="token"
                      className="mb-2 block font-mono-ui text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                    >
                      Admin API Token
                    </label>
                    <div className="relative">
                      <input
                        id="token"
                        className="terminal-input pr-20 font-mono-ui text-[0.95rem]"
                        placeholder="shpat_xxxxx..."
                        type={showToken ? "text" : "password"}
                        value={token}
                        onChange={(event) => {
                          setToken(event.target.value);
                          if (state === "error") {
                            resetStatus();
                          }
                        }}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowToken((currentValue) => !currentValue)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 font-mono-ui text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors duration-200 ease-out hover:text-[var(--text-primary)]"
                      >
                        {showToken ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="terminal-button flex h-14 w-full items-center justify-center gap-3 font-display text-base font-bold tracking-[0.04em]"
                  >
                    {state === "loading" ? (
                      <>
                        <span className="spinner border-[rgba(10,10,15,0.25)] border-t-[var(--bg-primary)]" />
                        <span>Scanning Store...</span>
                      </>
                    ) : (
                      "Run Diagnostic"
                    )}
                  </button>
                </form>

                {state === "success" && result ? (
                  <div
                    className="mt-5 animate-fade-up rounded-[1.35rem] border border-[rgba(0,255,135,0.35)] bg-[rgba(0,255,135,0.06)] p-5"
                    style={{ animationDelay: "70ms" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-display text-xl font-semibold text-[var(--text-primary)]">
                        ✓ Connected — {result.shop.name}
                      </p>
                      <p className="font-mono-ui text-xs uppercase tracking-[0.18em] text-[var(--text-mono)]">
                        Store snapshot ready
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className="mono-chip rounded-full px-3 py-1.5 font-mono-ui text-sm">
                        {totalProducts} Products
                      </span>
                      <span className="mono-chip rounded-full px-3 py-1.5 font-mono-ui text-sm">
                        {totalPages} Pages
                      </span>
                      <span className="mono-chip rounded-full px-3 py-1.5 font-mono-ui text-sm">
                        {totalVariants} Variants
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!result) return;
                        setAnalyzing(true);
                        setAnalysisMessage(
                          `Analyzing ${result.totals.products} products...`,
                        );

                        try {
                          const resp = await fetch("/api/analyze-store", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ domain, token }),
                          });

                          const payload = await resp.json();
                          if (!resp.ok || !payload.success) {
                            throw new Error(payload.error ?? "Analysis failed");
                          }

                          setAuditReport(payload.report);
                          const validCount =
                            payload.report.productAudits?.filter(
                              (p: ProductAudit) => p.totalScore > 0,
                            ).length ?? 0;
                          setAnalysisMessage(
                            `Analysis complete — ${validCount} products scored`,
                          );
                          setTimeout(() => setAnalysisMessage(""), 6000);
                        } catch (err) {
                          setAnalysisMessage(
                            err instanceof Error
                              ? err.message
                              : "Analysis failed",
                          );
                          setTimeout(() => setAnalysisMessage(""), 6000);
                        } finally {
                          setAnalyzing(false);
                        }
                      }}
                      disabled={analyzing || !result}
                      className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-[rgba(0,255,135,0.2)] bg-[rgba(0,255,135,0.1)] font-display text-sm font-semibold text-[var(--text-primary)]"
                    >
                      {analyzing ? (
                        <span className="font-mono-ui animate-pulse">
                          {analysisMessage}
                        </span>
                      ) : (
                        "Run AI Analysis →"
                      )}
                    </button>
                  </div>
                ) : null}

                {state === "error" ? (
                  <div
                    className="mt-5 animate-fade-up rounded-[1.35rem] border border-[rgba(255,68,68,0.4)] bg-[rgba(255,68,68,0.08)] p-5"
                    style={{ animationDelay: "70ms" }}
                  >
                    <p className="font-display text-xl font-semibold text-[#ff9a9a]">
                      Connection failed
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.82)]">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={resetStatus}
                      className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-[rgba(255,68,68,0.25)] bg-[rgba(255,68,68,0.12)] px-5 font-display text-sm font-semibold text-[var(--text-primary)] transition-transform duration-200 ease-out hover:scale-[1.02]"
                    >
                      Try Again
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="relative z-10 pb-14 lg:pb-20">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                  How It Works
                </p>
                <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Three steps. One diagnostic pass.
                </h3>
              </div>
            </div>

            <div className="relative">
              <div className="step-connector absolute left-[10%] right-[10%] top-7 hidden h-px md:block" />
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Connect",
                    copy: "Enter your shop domain and Admin API token to pull live store data.",
                    icon: <PlugIcon />,
                    step: "01",
                  },
                  {
                    title: "Analyze",
                    copy: "Scan products, pages, and policies the way an AI buyer would interpret them.",
                    icon: <ScanIcon />,
                    step: "02",
                  },
                  {
                    title: "Optimize",
                    copy: "Surface gaps and misrepresentation risks before your next AI workflow touches the store.",
                    icon: <ChartIcon />,
                    step: "03",
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="terminal-panel animate-fade-up rounded-[1.4rem] p-5"
                    style={{
                      animationDelay:
                        item.step === "01"
                          ? "0ms"
                          : item.step === "02"
                            ? "70ms"
                            : "120ms",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--accent-green-border)] bg-[var(--accent-green-dim)] text-[var(--text-mono)]">
                        {item.icon}
                      </div>
                      <span className="font-mono-ui text-sm tracking-[0.24em] text-[var(--text-mono)]">
                        {item.step}
                      </span>
                    </div>
                    <h4 className="mt-4 font-display text-xl font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {item.copy}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
