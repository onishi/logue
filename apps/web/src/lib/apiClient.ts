export function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

export function apiFetch(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(baseUrl, path), { ...init, credentials: "include" });
}
