// Only allowlisted codes and application-owned messages reach logs or the admin UI.
// Provider messages can echo API keys or request data, so never forward them.
const messages = {
  regeneration_required:
    'This saved draft used a retired AI configuration. Click Regenerate to create a new draft with Gemini.',
  quota_exceeded:
    'Gemini quota or rate limit reached. Check the model free-tier limits and project quota in Google AI Studio, or try again later.',
  billing_required:
    'Gemini requires billing for this request. Check the selected model and project billing settings in Google AI Studio.',
  not_configured:
    'AI is not configured. Add GEMINI_API_KEY to the backend environment.',
  invalid_api_key:
    'Gemini rejected the API credentials. Check GEMINI_API_KEY in the backend environment and restart the backend.',
  access_denied:
    'Gemini denied access. Check the project permissions and model access for this API key.',
  model_not_found:
    'The configured Gemini model is unavailable to this project. Check GEMINI_MODEL and model access.',
  rate_limit_exceeded:
    'Gemini is temporarily rate limiting requests. Wait briefly before regenerating the draft.',
  provider_unavailable:
    'Gemini is temporarily unavailable. Try regenerating the draft later.',
  request_rejected:
    'Gemini rejected the request. Check the backend model configuration.',
  timeout: 'The Gemini request timed out. Try regenerating the draft.',
  connection_failed:
    'The backend could not reach Gemini. Check its network connection and try again.',
  response_refused:
    'Gemini declined to generate this response. Write a manual reply or revise the query.',
  incomplete_response:
    'Gemini returned an incomplete response. Try regenerating or write a manual reply.',
  invalid_response:
    'Gemini returned an invalid response. Try regenerating or write a manual reply.',
  generation_failed:
    'AI draft generation failed. Try regenerating or write a manual reply.',
};

export function aiDiagnostic(code, status = null, provider = 'gemini') {
  const safeCode = Object.hasOwn(messages, code) ? code : 'generation_failed';
  return { code: safeCode, status, provider, message: messages[safeCode] };
}

export function providerDiagnostic(status, code, provider = 'gemini') {
  if (Object.hasOwn(messages, code))
    return aiDiagnostic(code, status, provider);
  if (status === 401) return aiDiagnostic('invalid_api_key', status, provider);
  if (status === 403) return aiDiagnostic('access_denied', status, provider);
  if (status === 404) return aiDiagnostic('model_not_found', status, provider);
  if (status === 429)
    return aiDiagnostic('rate_limit_exceeded', status, provider);
  if (status >= 500)
    return aiDiagnostic('provider_unavailable', status, provider);
  return aiDiagnostic('request_rejected', status, provider);
}

export function geminiDiagnostic(status, payload) {
  const reasons = Array.isArray(payload?.error?.details)
    ? payload.error.details.map((detail) => detail?.reason)
    : [];
  if (reasons.includes('API_KEY_INVALID') || status === 401)
    return aiDiagnostic('invalid_api_key', status, 'gemini');
  if (status === 402 || reasons.includes('BILLING_DISABLED'))
    return aiDiagnostic('billing_required', status, 'gemini');
  if (status === 429 || payload?.error?.status === 'RESOURCE_EXHAUSTED')
    return aiDiagnostic('quota_exceeded', status, 'gemini');
  return providerDiagnostic(status, null, 'gemini');
}

export function exceptionDiagnostic(error, provider = 'gemini') {
  if (error?.aiDiagnostic) return error.aiDiagnostic;
  if (['AbortError', 'TimeoutError'].includes(error?.name))
    return aiDiagnostic('timeout', null, provider);
  if (error instanceof SyntaxError)
    return aiDiagnostic('invalid_response', null, provider);
  if (error instanceof TypeError)
    return aiDiagnostic('connection_failed', null, provider);
  return aiDiagnostic('generation_failed', null, provider);
}

export function aiFailure(diagnostic) {
  return Object.assign(new Error(diagnostic.message), {
    aiDiagnostic: diagnostic,
  });
}

export function logAiFailure(diagnostic, logger = console) {
  logger.warn('AI response generation failed', {
    provider: diagnostic.provider,
    code: diagnostic.code,
    status: diagnostic.status,
    message: diagnostic.message,
  });
}
