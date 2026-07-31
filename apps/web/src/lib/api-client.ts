const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

// Refresh single-flight : les requêtes 401 simultanées partagent le même
// POST /auth/refresh (la rotation du refresh token révoque tout en cas de replay).
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Le refresh automatique s'applique à toutes les routes sauf celles du flux
// d'auth lui-même (login, refresh, logout…) ; /auth/me en bénéficie.
function canAutoRefresh(path: string): boolean {
  if (!path.startsWith("/api/v1/auth/")) return true;
  return path === "/api/v1/auth/me";
}

function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Access token expiré (15 min) : refresh puis rejoue la requête une fois ;
    // si le refresh échoue, la session est morte → retour au login.
    if (res.status === 401 && !isRetry && canAutoRefresh(path)) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(path, options, true);
      }
      redirectToLogin();
    }
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
