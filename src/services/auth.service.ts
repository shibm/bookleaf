import type { UserRecord } from '../types.ts';
import { User } from '../models/index.ts';
import { verifyPassword, hashPassword } from '../utils/password.ts';
import { failure } from '../utils/http-error.ts';
import { text } from '../utils/validation.ts';

const dummyHash: string = hashPassword('dummy-account-password');

export async function authenticate(
  input: Record<string, unknown>,
): Promise<UserRecord> {
  const email: string = text(input.email, 'Email', 3, 254).toLowerCase();
  const password: string = text(input.password, 'Password', 1, 200);
  const user: UserRecord | null = await User.findOne({ email })
    .select('+password_hash')
    .lean();
  // Keep the expensive password check for unknown accounts as well.
  const valid: boolean = verifyPassword(
    password,
    user?.password_hash || dummyHash,
  );
  if (!user || !valid) throw failure(401, 'Incorrect email or password.');
  return user;
}
