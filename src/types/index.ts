/** Chat message */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** If assistant generated a design, reference to the version */
  designVersion?: number;
}

/** Design version snapshot */
export interface DesignVersion {
  version: number;
  textureDataURL: string; // PNG data URL of the UV texture
  prompt: string; // User prompt that created this version
  timestamp: number;
}

/** Zones that GPT-4o determined need editing */
export interface EditIntent {
  type: "generate" | "edit" | "regenerate";
  activeZones: string[]; // zone IDs to keep active
  enhancedPrompt: string; // GPT-4o enriched prompt
}

/** Chat state */
export interface ChatState {
  messages: Message[];
  versions: DesignVersion[];
  currentVersion: number;
  isGenerating: boolean;
}