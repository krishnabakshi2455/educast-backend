import { randomBytes } from 'crypto';

/**
 * Generates a human-enterable, unique-looking school code.
 * Format: SCH-XXXXXX (6 uppercase alphanumeric chars).
 * Uniqueness is enforced by the database unique constraint on schoolCode;
 * the repository retries on collision (extremely rare with this keyspace).
 */
export function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `SCH-${code}`;
}
