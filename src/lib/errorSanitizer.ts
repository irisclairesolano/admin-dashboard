/**
 * Error message sanitizer for SIKAP Admin Dashboard.
 *
 * Guarantees that internal infrastructure details (Render, Supabase URLs,
 * database errors, SQL dumps, internal stack traces) are never displayed
 * in UI alerts or toasts.
 */

const SENSITIVE_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /[a-zA-Z0-9-]+\.onrender\.com[^\s]*/gi,
  /[a-zA-Z0-9-]+\.supabase\.co[^\s]*/gi,
  /\/api\/v[0-9]+[^\s]*/gi,
];

const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'failed to fetch',
  'network error',
  'econnrefused',
  'etimedout',
  'enotfound',
  'timeout of',
  'aborterror',
];

const INTERNAL_SERVER_PATTERNS = [
  'sqlstate',
  'queryexception',
  'syntax error',
  'stack trace',
  'pdoexception',
  'class not found',
  'call to undefined',
];

export function sanitizeErrorMessage(rawInput: unknown): string {
  if (rawInput === null || rawInput === undefined) {
    return 'An unexpected error occurred. Please try again.';
  }

  let message =
    typeof rawInput === 'string'
      ? rawInput
      : (rawInput as any)?.response?.data?.message ||
        (rawInput as any)?.message ||
        String(rawInput);

  const lower = message.toLowerCase();

  // 1. Network / connectivity error
  for (const pattern of NETWORK_ERROR_PATTERNS) {
    if (lower.includes(pattern)) {
      return 'Unable to connect to the server. Please check your network connection and try again.';
    }
  }

  // 2. HTML error page from backend / proxy
  if (
    message.includes('<!DOCTYPE') ||
    message.includes('<html') ||
    message.includes('Server returned an error page')
  ) {
    return 'The server is temporarily unavailable. Please try again later.';
  }

  // 3. Database / internal crash leaks
  for (const pattern of INTERNAL_SERVER_PATTERNS) {
    if (lower.includes(pattern)) {
      return 'An internal server error occurred. Please contact support or try again later.';
    }
  }

  // 4. Strip sensitive URLs
  let sanitized = message;
  for (const regex of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(regex, 'the server');
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (!sanitized || sanitized === 'the server' || sanitized.length < 3) {
    return 'An unexpected error occurred. Please try again.';
  }

  return sanitized;
}
