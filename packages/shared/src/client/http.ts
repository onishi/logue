import { ApiError } from "./apiError";

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export async function apiRequest(
  options: ApiClientOptions,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const doFetch = options.fetch ?? fetch;
  const res = await doFetch(`${options.baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (res.status === 204) {
    return undefined;
  }

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body;
}
