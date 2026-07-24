import { generateSignedCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "../auth/session";

/** テストで /api/auth の実フローを経由せずログイン済みセッション Cookie を作る */
export async function createAuthCookieHeader(secret: string, userId: string): Promise<string> {
  const payload = JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const cookie = await generateSignedCookie(SESSION_COOKIE_NAME, payload, secret);
  return cookie.split(";")[0] ?? "";
}
