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
const DESIGN_SYSTEM_PROMPT = `You are generating a seamless textile design for a T-shirt UV map.
The provided image is a UV layout where WHITE areas are the fabric zones (front, back, sleeves, neck) 
and BLACK areas are non-fabric background that must remain BLACK.
Generate the design ONLY on the white fabric zones. Do NOT paint over the black background areas.
The design should be continuous and visually coherent across all white zones.
Ensure the design looks professional and print-ready.`;

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

  // Convert base64 to Buffer for File API upload
  const buffer = Buffer.from(uvMaskBase64, "base64");

  // Upload UV mask via File API (handles large files properly)
  const uploadedFile = await client.files.upload({
    file: new Blob([buffer], { type: "image/png" }),
    config: { mimeType: "image/png" },
  });

  if (!uploadedFile.uri || !uploadedFile.mimeType) {
    throw new Error("File upload failed — no URI returned");
  }

  // Generate design using the uploaded file reference
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
            fileData: {
              fileUri: uploadedFile.uri,
              mimeType: uploadedFile.mimeType,
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