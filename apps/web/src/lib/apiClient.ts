export function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

// この値自体に意味はなく、常に付与することでブラウザに CORS プリフライトを強制させるための
// マーカー。セッションは Cookie（SameSite=None、クロスオリジンの API を叩くため）で認証して
// いるため、この見えないヘッダーがないと「シンプルリクエスト」とみなされる POST 等が
// プリフライトなしで送信されてしまい、他サイトからの CSRF を許してしまう
// （API 側の requireCustomHeaderForCsrf ミドルウェアと対）。
const CSRF_HEADER_NAME = "X-Logue-Client";
const CSRF_HEADER_VALUE = "web";

export function apiFetch(baseUrl: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(baseUrl, path), {
    ...init,
    credentials: "include",
    headers: { ...init?.headers, [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
  });
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
