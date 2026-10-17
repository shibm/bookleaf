import { User, verifyPassword, hashPassword } from '../db.js';
import { failure } from '../utils/http-error.js';
import { text } from '../utils/validation.js';

const dummyHash = hashPassword('dummy-account-password');

export async function authenticate(input) {
  const email = text(input.email, 'Email', 3, 254).toLowerCase();
  const password = text(input.password, 'Password', 1, 200);
  const user = await User.findOne({ email }).select('+password_hash').lean();
  // Keep the expensive password check for unknown accounts as well.
  const valid = verifyPassword(password, user?.password_hash || dummyHash);
  if (!user || !valid) throw failure(401, 'Incorrect email or password.');
  return user;
}
