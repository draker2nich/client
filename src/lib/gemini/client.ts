import { GoogleGenAI } from "@google/genai";

// --- Singleton client ---
let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

// --- Models ---
const TEXT_MODEL = "gemini-3-flash-preview";
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

// --- Prompt Enhancement ---
const ENHANCE_SYSTEM_PROMPT = `You are an expert fashion designer and AI art director. 
Your task is to transform a user's brief clothing design description into a detailed, 
vivid prompt optimized for AI image generation on a T-shirt UV map.

RULES:
- Output ONLY the enhanced prompt text, nothing else.
- The design will be applied to a T-shirt UV map (flat layout: front, back, sleeves, neck).
- Describe colors, patterns, textures, artistic style, and mood in detail.
- Ensure the design is seamless and works across all zones of the UV map.
- If the user mentions specific elements (e.g. "unicorn on front"), preserve the placement intent.
- Keep the prompt under 300 words.
- The prompt must be in English (translate if the user writes in Russian or other languages).
- Think about how the design wraps around a 3D garment — ensure visual continuity.
- Do NOT include instructions about image format, resolution, or technical parameters.
- Focus on artistic description: what the viewer SEES on the fabric.`;

export async function enhancePrompt(userPrompt: string): Promise<string> {
  const client = getClient();

  const response = await client.models.generateContent({
    model: TEXT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: ENHANCE_SYSTEM_PROMPT,
      temperature: 1.0,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Empty response from prompt enhancement");
  }

  return text;
}

// --- Image Generation ---
const DESIGN_SYSTEM_PROMPT = `You are a professional textile print designer. You are editing a T-shirt UV texture map image.

CRITICAL RULES — follow these exactly:

1. MASK LOGIC: The provided image is a flat UV unwrap of a T-shirt. It contains two types of areas:
   - WHITE zones = fabric panels (front torso, back torso, left sleeve, right sleeve, neck). These are the ONLY areas you may paint on.
   - BLACK zones = empty background outside the fabric panels. These areas MUST stay pure black (#000000). Do NOT place any design, color, gradient, or texture on the black areas.

2. PRESERVE SHAPE: Do not alter, shift, or distort the boundaries between white and black zones. The silhouette of each fabric panel must remain exactly as provided.

3. DESIGN PLACEMENT: Fill every white fabric zone with the requested design. The design should be continuous, visually coherent, and look natural when the UV map is wrapped onto a 3D T-shirt model. Think about how front, back, sleeves, and neck connect on a real garment.

4. PRINT QUALITY: The output must look like a professional, print-ready textile pattern — crisp details, vibrant colors, no artifacts, no watermarks, no text unless explicitly requested.

5. OUTPUT FORMAT: Return a single square image at the same resolution as the input. The image must be a valid UV texture map that can be directly applied to a 3D model.

6. ABSOLUTE CONSTRAINT: If any part of the black background gets colored or altered, the output is INVALID. The black areas act as a hard mask — treat them as untouchable.`;

export interface GenerateDesignOptions {
  enhancedPrompt: string;
  uvMaskBase64: string; // base64-encoded PNG (no data: prefix)
}

export interface GenerateDesignResult {
  imageBase64: string;
  mimeType: string;
}

export async function generateDesign(
  options: GenerateDesignOptions
): Promise<GenerateDesignResult> {
  const client = getClient();
  const { enhancedPrompt, uvMaskBase64 } = options;

  const response = await client.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${DESIGN_SYSTEM_PROMPT}\n\nDesign request: ${enhancedPrompt}`,
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: uvMaskBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "2K",
      },
    },
  });

  // Extract the generated image
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates in image generation response");
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error("No parts in image generation response");
  }

  for (const part of parts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data as string,
        mimeType: (part.inlineData.mimeType as string) || "image/png",
      };
    }
  }

  throw new Error("No image data in generation response");
}