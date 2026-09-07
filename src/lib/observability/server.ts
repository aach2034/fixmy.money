const SENSITIVE_KEYS = /authorization|cookie|token|secret|password|email|phone|address|content|prompt/i;

export function requestId(request: Request): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && /^[A-Za-z0-9._-]{8,128}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export function redactMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_KEYS.test(key) ? '[REDACTED]' : typeof item === 'string' && item.length > 256 ? `${item.slice(0, 256)}…` : item,
  ]));
}

export function operationalLog(level: 'info' | 'warn' | 'error', event: string, id: string, metadata: Record<string, unknown> = {}) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, request_id: id, ...redactMetadata(metadata) });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}

export async function within<T>(promise: PromiseLike<T>, milliseconds = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DEPENDENCY_TIMEOUT')), milliseconds); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
