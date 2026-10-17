import { failure } from './http-error.js';
export function text(value, field, min = 1, max = 10000) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw failure(422, `${field} must contain ${min}–${max} characters.`);
  return value.trim();
}
