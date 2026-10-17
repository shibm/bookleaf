import { aiDiagnostic, geminiDiagnostic, aiFailure } from '../../ai-errors.js';

export async function generateGemini({
  apiKey,
  model,
  prompt,
  signal,
  fetchImpl,
}) {
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      // Keep the API key out of URLs, where proxies and access logs could record it.
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.instructions }] },
        contents: [{ role: 'user', parts: [{ text: prompt.input }] }],
        generationConfig: {
          maxOutputTokens: 1000,
          responseFormat: {
            text: { mimeType: 'APPLICATION_JSON', schema: prompt.schema },
          },
        },
      }),
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw aiFailure(geminiDiagnostic(response.status, payload));
  }
  const result = await response.json();
  if (result?.promptFeedback?.blockReason)
    throw aiFailure(aiDiagnostic('response_refused', null, 'gemini'));
  const candidate = result?.candidates?.[0];
  if (
    [
      'SAFETY',
      'RECITATION',
      'BLOCKLIST',
      'PROHIBITED_CONTENT',
      'SPII',
      'IMAGE_SAFETY',
    ].includes(candidate?.finishReason)
  )
    throw aiFailure(aiDiagnostic('response_refused', null, 'gemini'));
  if (candidate?.finishReason !== 'STOP')
    throw aiFailure(aiDiagnostic('incomplete_response', null, 'gemini'));
  if (!Array.isArray(candidate.content?.parts))
    throw aiFailure(aiDiagnostic('invalid_response', null, 'gemini'));
  return candidate.content.parts
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}
