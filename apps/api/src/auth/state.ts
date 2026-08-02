export const OAUTH_STATE_COOKIE_NAME = "logue_oauth";
// Googleスプレッドシート連携の同意フロー用。ログインフローの state cookie とは別物にし、
// 進行中のログインフローと衝突しないようにする。
export const SHEETS_OAUTH_STATE_COOKIE_NAME = "logue_sheets_oauth";
export const OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10分

export function encodeOAuthStateCookie(state: string, codeVerifier: string): string {
  return `${state}:${codeVerifier}`;
}

export function decodeOAuthStateCookie(
  value: string | undefined,
): { state: string; codeVerifier: string } | null {
  if (!value) return null;
  const [state, codeVerifier] = value.split(":");
  if (!state || !codeVerifier) return null;
  return { state, codeVerifier };
}
