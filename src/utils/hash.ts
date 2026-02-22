/**
 * Password and token hashing utilities (bcryptjs – pure JS, no native build).
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function compareToken(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
