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
