import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  return timingSafeEqual(
    Buffer.from(key, 'hex'),
    scryptSync(password, salt, 64),
  );
}
