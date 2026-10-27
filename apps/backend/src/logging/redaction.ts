const REDACTED = '[Redacted]';

/** Names are compared lowercase with "_" and "-" removed, so access_token, accessToken and Access-Token all match. */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'idtoken',
  'refreshtoken',
  'code',
  'secret',
  'clientsecret',
  'apikey',
  'authorization',
]);

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''));
}

/** Replaces the value of any sensitive query parameter: "?access_token=abc&page=1" becomes "?access_token=[Redacted]&page=1". */
export function redactUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const questionMark = url.indexOf('?');
  if (questionMark === -1) return url;

  const path = url.slice(0, questionMark);
  const pairs = url
    .slice(questionMark + 1)
    .split('&')
    .map((pair) => {
      const equals = pair.indexOf('=');
      if (equals === -1) return pair;
      const rawKey = pair.slice(0, equals);
      let key = rawKey;
      try {
        key = decodeURIComponent(rawKey);
      } catch {
        // Malformed encoding: fall back to the raw key.
      }
      return isSensitiveKey(key) ? `${rawKey}=${REDACTED}` : pair;
    });
  return `${path}?${pairs.join('&')}`;
}

/** Returns a copy of the value with sensitive fields replaced. Walks nested objects and arrays. The original is never modified. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[Truncated]';
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = isSensitiveKey(key) ? REDACTED : redactValue(val, depth + 1);
    }
    return result;
  }
  return value;
}