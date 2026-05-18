import { NextRequest, NextResponse } from "next/server";
import { runShoppingAgent } from "@/lib/shopping-agent";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messages?: { role: string; content: string }[];
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const result = await runShoppingAgent(messages);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process shopping request.";

    return NextResponse.json(
      {
        message,
        requiresAction: true,
      },
      { status: 500 },
    );
  }
}
