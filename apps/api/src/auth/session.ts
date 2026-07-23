import type { Context } from "hono";
import { getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";

export const SESSION_COOKIE_NAME = "logue_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30日
export const SESSION_RENEW_THRESHOLD_SECONDS = 60 * 60 * 24 * 7; // 残り7日を切ったら延長

type SessionPayload = {
  sub: string;
  exp: number;
};

function isSessionPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SessionPayload).sub === "string" &&
    typeof (value as SessionPayload).exp === "number"
  );
}

export async function writeSessionCookie(
  c: Context,
  secret: string,
  userId: string,
): Promise<void> {
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  await setSignedCookie(c, SESSION_COOKIE_NAME, JSON.stringify(payload), secret, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context): void {
  setCookie(c, SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionPayload(
  c: Context,
  secret: string,
): Promise<SessionPayload | null> {
  const raw = await getSignedCookie(c, secret, SESSION_COOKIE_NAME);
  if (!raw) return null;

  try {
    const payload: unknown = JSON.parse(raw);
    if (!isSessionPayload(payload)) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function shouldRenewSession(payload: SessionPayload): boolean {
  return payload.exp - Math.floor(Date.now() / 1000) < SESSION_RENEW_THRESHOLD_SECONDS;
}
