import { NextRequest, NextResponse } from "next/server";
import { AGENT_PROFILE_URL, FALLBACK_STORES } from "@/lib/ucp";

export const runtime = "nodejs";

type CatalogSearchBody = {
  query?: string;
  filters?: {
    maxPrice?: number;
    currency?: string;
  };
};

type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  merchant: string;
  merchantUrl: string;
  imageUrl: string;
  checkoutUrl: string;
  variantId: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toAbsoluteUrl(value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function parsePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractTextContent(payload: unknown): string[] {
  const texts: string[] = [];
  const seen = new Set<object>();

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.text === "string") texts.push(record.text);
    if (typeof record.content === "string") texts.push(record.content);
    if (typeof record.output_text === "string") texts.push(record.output_text);
    if (typeof record.result === "string") texts.push(record.result);

    Object.values(record).forEach(walk);
  };

  walk(payload);
  return texts;
}

function collectCandidateObjects(payload: unknown): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const seen = new Set<object>();

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;
    const hasProductShape =
      typeof record.title === "string" &&
      (typeof record.price === "string" || typeof record.price === "number");

    if (hasProductShape) {
      candidates.push(record);
    }

    Object.values(record).forEach(walk);
  };

  walk(payload);
  return candidates;
}

function normalizeProducts(payload: unknown): CatalogProduct[] {
  const candidates = collectCandidateObjects(payload);
  const normalized: CatalogProduct[] = [];

  for (const candidate of candidates) {
    const title = normalizeText(candidate.title);
    const priceValue = parsePrice(candidate.price);
    if (!title || priceValue === null) continue;

    const merchantUrl = toAbsoluteUrl(
      normalizeText(
        candidate.merchantUrl ??
          candidate.storeUrl ??
          candidate.shopUrl ??
          candidate.url,
      ),
    );
    const checkoutUrl = toAbsoluteUrl(
      normalizeText(candidate.checkoutUrl ?? candidate.checkout_url ?? ""),
    );
    const currency = normalizeText(candidate.currency) || "INR";
    const merchant =
      normalizeText(candidate.merchant) ||
      normalizeText(candidate.vendor) ||
      normalizeText(candidate.storeName) ||
      normalizeText(candidate.shopName) ||
      new URL(merchantUrl || "https://example.com").hostname.replace(
        /^www\./i,
        "",
      ) ||
      "Shopify Merchant";

    normalized.push({
      id:
        normalizeText(candidate.id) ||
        normalizeText(candidate.variantId) ||
        `${title}-${normalized.length + 1}`,
      title,
      description:
        normalizeText(candidate.description) ||
        normalizeText(candidate.descriptionHtml) ||
        normalizeText(candidate.subtitle) ||
        "",
      price: String(priceValue),
      currency,
      merchant,
      merchantUrl,
      imageUrl:
        normalizeText(candidate.imageUrl) ||
        normalizeText(candidate.image_url) ||
        normalizeText(candidate.image) ||
        normalizeText(candidate.thumbnailUrl) ||
        "",
      checkoutUrl,
      variantId:
        normalizeText(candidate.variantId) ||
        normalizeText(candidate.variantID) ||
        normalizeText(candidate.id),
    });
  }

  const unique = new Map<string, CatalogProduct>();
  for (const product of normalized) {
    const key = product.variantId || product.id || product.title;
    if (!unique.has(key)) unique.set(key, product);
  }

  return Array.from(unique.values()).slice(0, 12);
}

type StoreProductJson = {
  products?: Array<{
    id: number;
    title: string;
    body_html?: string;
    vendor?: string;
    handle?: string;
    images?: Array<{ src?: string | null }>;
    variants?: Array<{
      id: number;
      price?: string;
      title?: string;
    }>;
  }>;
};

async function searchFallbackStores(query: string): Promise<CatalogProduct[]> {
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);

  const results: CatalogProduct[] = [];

  for (const store of FALLBACK_STORES) {
    try {
      const response = await fetch(`${store}/products.json?limit=50`);
      if (!response.ok) continue;

      const payload = (await response.json()) as StoreProductJson;
      const products = Array.isArray(payload.products) ? payload.products : [];

      for (const product of products) {
        const haystack = [product.title, product.vendor, product.body_html]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matches =
          queryTokens.length === 0 ||
          queryTokens.some((token) => haystack.includes(token));

        if (!matches) continue;

        const variant = product.variants?.[0];
        const imageUrl = product.images?.[0]?.src ?? "";
        const merchantUrl = store;

        results.push({
          id: String(product.id),
          title: product.title,
          description:
            typeof product.body_html === "string"
              ? product.body_html
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 280)
              : "",
          price: variant?.price ?? "0",
          currency: "USD",
          merchant: new URL(store).hostname.replace(/^www\./i, ""),
          merchantUrl,
          imageUrl,
          checkoutUrl: `${store}/products/${product.handle ?? ""}`,
          variantId: String(variant?.id ?? product.id),
        });
      }
    } catch (error) {
      console.warn("Fallback store search failed:", store, error);
    }
  }

  const unique = new Map<string, CatalogProduct>();
  for (const product of results) {
    if (!unique.has(product.id)) unique.set(product.id, product);
  }

  return Array.from(unique.values()).slice(0, 9);
}

export async function POST(request: NextRequest) {
  let query = "";

  try {
    const body = (await request.json()) as CatalogSearchBody;
    query = body.query?.trim() ?? "";
    const maxPrice = body.filters?.maxPrice;
    const currencyFilter = body.filters?.currency?.trim()?.toUpperCase();

    if (!query) {
      return NextResponse.json(
        { success: false, error: "A search query is required." },
        { status: 400 },
      );
    }

    const response = await fetch("https://catalog.shopify.com/api/ucp/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "search_catalog",
          arguments: {
            catalog: {
              search: {
                query,
                context: {
                  buyer: {
                    countryCode: "IN",
                    languageCode: "EN",
                  },
                },
              },
            },
            meta: {
              "ucp-agent": {
                profile: AGENT_PROFILE_URL,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Global Catalog request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as unknown;
    const products = normalizeProducts(payload).filter((product) => {
      if (currencyFilter && product.currency.toUpperCase() !== currencyFilter) {
        return false;
      }

      if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
        const numericPrice = Number.parseFloat(product.price);
        if (Number.isFinite(numericPrice) && numericPrice > maxPrice) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Global Catalog is unavailable right now.";

    console.warn("Global Catalog unavailable, using fallback stores:", error);

    const fallbackProducts = await searchFallbackStores(query);

    if (fallbackProducts.length > 0) {
      return NextResponse.json({
        success: true,
        message:
          "Global Catalog is currently in testing phase. Try again in a moment, or I can search specific stores for you.",
        products: fallbackProducts,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Global Catalog is currently in testing phase. Try again in a moment, or I can search specific stores for you.",
        error: `Unable to search Shopify Global Catalog: ${message}`,
      },
      { status: 503 },
    );
  }
}
