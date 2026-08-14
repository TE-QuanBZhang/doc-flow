// API configuration and utility functions

// Get API base URL from environment variable.
// Priority:
//   1. VITE_API_BASE explicitly set (e.g. "http://localhost:8000")
//   2. Empty string → same-origin mode (Vite dev proxy /api → backend)
//
// In doc-flow the Vite dev server proxies /api to the FastAPI backend,
// so the default empty base URL (relative calls) is the right choice.
export const API_BASE_URL: string = (() => {
  const envBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (envBase !== undefined && envBase !== "") {
    return envBase;
  }
  // Fall back to same-origin so relative API calls still work.
  return "";
})();

/**
 * Construct a full API URL from a path
 * @param path - API path (e.g., '/api/v1/knowledge/list')
 * @returns Full URL (e.g., 'http://localhost:8000/api/v1/knowledge/list')
 */
/**
 * Return Authorization header if a doc-flow JWT token is stored in localStorage.
 */
export function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("doc_flow_token") || ""
      : "";
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function apiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Remove trailing slash from base URL if present
  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  return `${base}${normalizedPath}`;
}

/**
 * Construct a WebSocket URL from a path
 * @param path - WebSocket path (e.g., '/api/v1/solve')
 * @returns WebSocket URL (e.g., 'ws://localhost:{backend_port}/api/v1/solve')
 * Note: backend_port is configured in config/main.yaml
 */
export function wsUrl(path: string): string {
  // If API_BASE_URL is empty (same-origin), derive ws URL from window.location
  let base: string;
  if (!API_BASE_URL && typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    base = `${proto}//${window.location.host}`;
  } else {
    // Security Hardening: Convert http to ws and https to wss.
    base = API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  }

  // Remove leading slash if present to avoid double slashes
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Remove trailing slash from base URL if present
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  return `${normalizedBase}${normalizedPath}`;
}
