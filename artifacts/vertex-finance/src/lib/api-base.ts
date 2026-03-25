/**
 * Returns the API base URL (without trailing slash).
 *
 * Priority:
 *   1. VITE_API_URL — set this in production to point to your API server
 *      e.g. VITE_API_URL=https://api.vertexos.com
 *   2. Derived from BASE_URL — automatic fallback for Replit dev environment
 */
export function getApiBase(): string {
  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
  }
  const base = import.meta.env.BASE_URL ?? "/";
  if (!base || base === "/") return "";
  return base.replace(/\/$/, "").replace(/\/[^/]*$/, "");
}
