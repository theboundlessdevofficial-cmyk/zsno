
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AspectRatio, ImageSize, Message } from "../types";

export const moderateChat = async (messages: Message[], reportedUser: string): Promise<{ verdict: string, reason: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const chatLog = messages
    .filter(m => m.type === 'text')
    .map(m => `${m.senderName}: ${m.text}`)
    .join('\n');

  const prompt = `Analyze the following chat transcript. The user "${reportedUser}" has been reported for misconduct. 
  Decide if the behavior of "${reportedUser}" is harmful, toxic, or violates community standards.
  Provide a verdict (SAFE or UNSAFE) and a brief reason.
  
  Transcript:
  ${chatLog}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, description: 'SAFE or UNSAFE' },
            reason: { type: Type.STRING, description: 'Explanation for the verdict' }
          },
          required: ['verdict', 'reason']
        }
      }
    });

    return JSON.parse(response.text || '{"verdict": "ERROR", "reason": "Failed to parse"}');
  } catch (error) {
    console.error("Moderation error:", error);
    return { verdict: "ERROR", reason: "AI Moderation service unavailable." };
  }
};

export const generateImage = async (
  prompt: string, 
  aspectRatio: AspectRatio, 
  imageSize: ImageSize
): Promise<string> => {
  // Use a new instance to ensure up-to-date API key from dialog if needed
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          // Note: Standard API supports 1:1, 3:4, 4:3, 9:16, 16:9
          // We map others to the closest available if needed, but per instructions we try to use the ones requested.
          aspectRatio: aspectRatio as any, 
          imageSize: imageSize as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};
