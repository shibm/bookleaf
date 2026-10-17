// Only allowlisted codes and application-owned messages reach logs or the admin UI.
// Provider messages can echo API keys or request data, so never forward them.
const messages = {
  not_configured:
    'AI is not configured. Add OPENAI_API_KEY to the backend environment.',
  credit_balance_exhausted:
    'OpenAI API credit balance is exhausted. Add credits in OpenAI Billing, then regenerate the draft.',
  insufficient_quota:
    'OpenAI API quota is unavailable. Check credits and usage limits in OpenAI Billing, then regenerate the draft.',
  organization_spend_limit_exceeded:
    'The OpenAI organization spend limit has been reached. Update the billing limit before regenerating.',
  project_spend_limit_exceeded:
    'The OpenAI project spend limit has been reached. Update the project billing limit before regenerating.',
  organization_usage_limit_exceeded:
    'The OpenAI organization usage limit has been reached. Review the account usage limit before regenerating.',
  invalid_api_key:
    'OpenAI rejected the API credentials. Check OPENAI_API_KEY in the backend environment and restart the backend.',
  access_denied:
    'OpenAI denied access. Check the project permissions and model access for this API key.',
  model_not_found:
    'The configured OpenAI model is unavailable to this project. Check OPENAI_MODEL and model access.',
  rate_limit_exceeded:
    'OpenAI is temporarily rate limiting requests. Wait briefly before regenerating the draft.',
  provider_unavailable:
    'OpenAI is temporarily unavailable. Try regenerating the draft later.',
  request_rejected:
    'OpenAI rejected the request. Check the backend model configuration.',
  timeout: 'The OpenAI request timed out. Try regenerating the draft.',
  connection_failed:
    'The backend could not reach OpenAI. Check its network connection and try again.',
  response_refused:
    'OpenAI declined to generate this response. Write a manual reply or revise the query.',
  incomplete_response:
    'OpenAI returned an incomplete response. Try regenerating or write a manual reply.',
  invalid_response:
    'OpenAI returned an invalid response. Try regenerating or write a manual reply.',
  generation_failed:
    'AI draft generation failed. Try regenerating or write a manual reply.',
};

export function aiDiagnostic(code, status = null) {
  const safeCode = Object.hasOwn(messages, code) ? code : 'generation_failed';
  return { code: safeCode, status, message: messages[safeCode] };
}

export function providerDiagnostic(status, code) {
  if (Object.hasOwn(messages, code)) return aiDiagnostic(code, status);
  if (status === 401) return aiDiagnostic('invalid_api_key', status);
  if (status === 403) return aiDiagnostic('access_denied', status);
  if (status === 404) return aiDiagnostic('model_not_found', status);
  if (status === 429) return aiDiagnostic('rate_limit_exceeded', status);
  if (status >= 500) return aiDiagnostic('provider_unavailable', status);
  return aiDiagnostic('request_rejected', status);
}

export function exceptionDiagnostic(error) {
  if (error?.aiDiagnostic) return error.aiDiagnostic;
  if (['AbortError', 'TimeoutError'].includes(error?.name))
    return aiDiagnostic('timeout');
  if (error instanceof SyntaxError) return aiDiagnostic('invalid_response');
  if (error instanceof TypeError) return aiDiagnostic('connection_failed');
  return aiDiagnostic('generation_failed');
}

export function aiFailure(diagnostic) {
  return Object.assign(new Error(diagnostic.message), {
    aiDiagnostic: diagnostic,
  });
}

export function logAiFailure(diagnostic, logger = console) {
  logger.warn('AI response generation failed', {
    provider: 'openai',
    code: diagnostic.code,
    status: diagnostic.status,
    message: diagnostic.message,
  });
}
