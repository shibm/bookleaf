export interface GeminiRequest {
  systemInstruction: { parts: { text: string }[] };
  contents: { parts: { text: string }[] }[];
  generationConfig: {
    responseFormat: {
      text: { mimeType: string; schema: { required: string[] } };
    };
  };
}
