import { isTokenExpired as isJwtExpired } from "../utils/jwt";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta: { request_id: string; timestamp: string };
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function handleUnauthorized() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("username");
  onUnauthorized?.();
  if (typeof window === "undefined") return;
  // Jangan redirect jika sudah di /auth atau di test (vitest / jsdom)
  if (window.location.pathname.startsWith("/auth")) return;
  // Hindari loop di test environment
  const isTest = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
  if (isTest) return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  // Arahkan ke halaman login/signup sendiri
  if (window.location.pathname !== "/") {
    window.location.href = `/auth?redirect=${redirect}&reason=unauthorized`;
  } else {
    // Jika di home, cukup ke /auth tanpa redirect (atau dengan redirect=/)
    window.location.href = `/auth?redirect=${redirect}&reason=unauthorized`;
  }
}

function getValidToken(): string | null {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  if (isJwtExpired(token)) {
    handleUnauthorized();
    return null;
  }
  return token;
}

export function authHeaders(): Record<string, string> {
  const token = getValidToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Proactive check: if token already expired, logout immediately without network call
  const token = localStorage.getItem("access_token");
  if (token && isJwtExpired(token)) {
    handleUnauthorized();
    return new Response(JSON.stringify({ success: false, data: { detail: "Token expired" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) handleUnauthorized();
  return res;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isAuthEndpoint = endpoint.startsWith("/auth/");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (!isAuthEndpoint) {
    const rawToken = localStorage.getItem("access_token");
    if (rawToken) {
      if (isJwtExpired(rawToken)) {
        handleUnauthorized();
        throw new ApiError("Session expired, please login again", 401);
      }
      headers["Authorization"] = `Bearer ${rawToken}`;
    }
  } else {
    // For login/register, silently clear expired token without triggering redirect/throw,
    // and don't attach Authorization header
    const rawToken = localStorage.getItem("access_token");
    if (rawToken && isJwtExpired(rawToken)) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("username");
      onUnauthorized?.();
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) handleUnauthorized();

  const body: ApiResponse<T> = await res.json();

  if (!body.success) {
    throw new ApiError(
      (body.data as { detail: string }).detail || "Unknown error",
      (body.data as { status_code: number }).status_code || res.status
    );
  }

  return body.data;
}

export { request, ApiError };
export type { ApiResponse };
