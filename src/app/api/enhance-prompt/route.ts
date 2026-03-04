import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt } from "@/lib/gemini/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const enhanced = await enhancePrompt(prompt.trim());

    return NextResponse.json({ enhancedPrompt: enhanced });
  } catch (err) {
    console.error("[enhance-prompt] Error:", err);

    const message =
      err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}