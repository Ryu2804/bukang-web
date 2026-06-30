const BASE_URL = "/api";

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
