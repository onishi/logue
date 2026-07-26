export function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

export function apiFetch(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(baseUrl, path), { ...init, credentials: "include" });
}

export async function apiJson<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(baseUrl, path, init);
  if (!res.ok) {
    throw new Error(`API request failed: ${init?.method ?? "GET"} ${path} (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function jsonRequestInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
