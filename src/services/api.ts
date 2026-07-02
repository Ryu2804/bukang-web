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
  window.location.href = "/";
}

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
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
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
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
