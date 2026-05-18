import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CreateCartBody = {
  variantId?: string;
  storeUrl?: string;
  quantity?: number;
};

function normalizeStoreHost(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("storeUrl is required.");
  }

  try {
    return new URL(value).host;
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

function extractCheckoutUrl(payload: unknown): string {
  const seen = new Set<object>();

  const walk = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    if (seen.has(node as object)) return "";
    seen.add(node as object);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return "";
    }

    const record = node as Record<string, unknown>;
    for (const key of [
      "checkoutUrl",
      "checkout_url",
      "checkoutURL",
      "url",
      "webUrl",
    ]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }

    for (const value of Object.values(record)) {
      const found = walk(value);
      if (found) return found;
    }

    return "";
  };

  return walk(payload);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCartBody;
    const variantId = body.variantId?.trim() ?? "";
    const storeUrl = body.storeUrl?.trim() ?? "";
    const quantity = Number.isFinite(body.quantity) ? Number(body.quantity) : 1;

    if (!variantId || !storeUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "variantId and storeUrl are required.",
        },
        { status: 400 },
      );
    }

    const host = normalizeStoreHost(storeUrl);
    const response = await fetch(`https://${host}/api/ucp/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "update_cart",
          arguments: {
            lines: [{ variantId, quantity }],
            meta: {
              "ucp-agent": {
                profile:
                  "https://storesignal.onrender.com/.well-known/ucp-agent-profile.json",
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Storefront MCP request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as unknown;
    const checkoutUrl = extractCheckoutUrl(payload);

    if (!checkoutUrl) {
      throw new Error("No checkout URL was returned by the storefront.");
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create cart.";

    return NextResponse.json(
      {
        success: false,
        error: `Unable to create cart: ${message}`,
      },
      { status: 503 },
    );
  }
}
