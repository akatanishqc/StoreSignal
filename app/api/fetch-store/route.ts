import { NextRequest, NextResponse } from "next/server";
import { fetchStoreData, ShopifyStoreError } from "@/lib/shopify";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      domain?: string;
      token?: string;
    };

    const domain = body.domain ?? "";
    const token = body.token ?? "";

    const data = await fetchStoreData(domain, token);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof ShopifyStoreError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
