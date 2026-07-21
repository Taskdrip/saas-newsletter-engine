/**
 * Returns a full URL for an API path.
 *
 * In Replit's path-based routing the API artifact is mounted at /api,
 * so paths like /api/smtp-connections are routed correctly by the proxy.
 * In production (Railway) both services live on the same domain under the
 * same path prefix, so no prefix adjustment is needed.
 */
export function getApiUrl(path: string): string {
  // path already starts with /api/...
  return path;
}

/**
 * Convenience wrapper around fetch for JSON API calls.
 * Throws on non-2xx responses with the server's error message.
 */
export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error ?? data?.message ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}
