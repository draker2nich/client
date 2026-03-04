import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt, generateDesign } from "@/lib/gemini/client";

export const maxDuration = 60; // Allow up to 60s for image generation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, uvMaskBase64, skipEnhance } = body;

    // --- Validation ---
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (
      !uvMaskBase64 ||
      typeof uvMaskBase64 !== "string" ||
      uvMaskBase64.length === 0
    ) {
      return NextResponse.json(
        { error: "UV mask (base64) is required" },
        { status: 400 }
      );
    }

    // --- Step 1: Enhance prompt (unless skipped, e.g. for regeneration) ---
    let enhancedPrompt: string;

    if (skipEnhance && typeof body.enhancedPrompt === "string") {
      enhancedPrompt = body.enhancedPrompt;
    } else {
      enhancedPrompt = await enhancePrompt(prompt.trim());
    }

    // --- Step 2: Generate design on UV map ---
    // Strip data URL prefix if present
    const cleanBase64 = uvMaskBase64.replace(
      /^data:image\/[a-z]+;base64,/,
      ""
    );

    const result = await generateDesign({
      enhancedPrompt,
      uvMaskBase64: cleanBase64,
    });

    // --- Response ---
    return NextResponse.json({
      enhancedPrompt,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });
  } catch (err) {
    console.error("[generate-design] Error:", err);

    const message =
      err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}