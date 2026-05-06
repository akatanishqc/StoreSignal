import { NextRequest, NextResponse } from "next/server";
import { fetchStoreData, ShopifyStoreError } from "@/lib/shopify";
import analyzeStore from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { domain?: string; token?: string };
    const domain = body.domain ?? "";
    const token = body.token ?? "";

    const storeData = await fetchStoreData(domain, token);

    const report = await analyzeStore(storeData);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    if (error instanceof ShopifyStoreError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }

    const msg =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
