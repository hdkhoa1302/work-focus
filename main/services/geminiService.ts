import { GoogleGenAI } from '@google/genai';

export interface ChatRequest {
  model: string;
  contents: string;
  generationConfig?: {
    temperature?: number;
    candidateCount?: number;
    topP?: number;
    topK?: number;
  };
}

export interface ChatResponse {
  text: string;
}

// @ts-ignore: non-null assertion for environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const USE_MOCK = process.env.USE_MOCK_GEMINI === 'true';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  if (USE_MOCK) {
    return { text: 'Đây là phản hồi giả lập từ Gemini AI.' };
  }

  const response = await ai.models.generateContent({
    model: request.model,
    contents: request.contents,
    ...request.generationConfig,
  });

  return { text: response.text ?? '' };
} 