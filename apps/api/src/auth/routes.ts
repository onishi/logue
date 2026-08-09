import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "../env";
import { randomToken, sha256Base64Url } from "../crypto";
import { createUser, findUserByGoogleSub, toPublicUser } from "../db/users";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
} from "./google";
import { requireAuth, type AuthVariables } from "./middleware";
import { clearSessionCookie, writeSessionCookie } from "./session";
import {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_SECONDS,
  decodeOAuthStateCookie,
  encodeOAuthStateCookie,
} from "./state";

const auth = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function callbackRedirectUri(requestUrl: string): string {
  return new URL("/api/auth/callback", requestUrl).toString();
}

auth.get("/login", async (c) => {
  const state = randomToken(16);
  const codeVerifier = randomToken(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  setCookie(c, OAUTH_STATE_COOKIE_NAME, encodeOAuthStateCookie(state, codeVerifier), {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/api/auth",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri: callbackRedirectUri(c.req.url),
    state,
    codeChallenge,
  });

  return c.redirect(authorizationUrl);
});

auth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const returnedState = c.req.query("state");
  const stored = decodeOAuthStateCookie(getCookie(c, OAUTH_STATE_COOKIE_NAME));
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, { path: "/api/auth" });

  if (!code || !returnedState || !stored || stored.state !== returnedState) {
    return c.json({ error: "invalid_state" }, 400);
  }

  const tokens = await exchangeGoogleCodeForTokens({
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    redirectUri: callbackRedirectUri(c.req.url),
    code,
    codeVerifier: stored.codeVerifier,
  });

  const googleUser = await fetchGoogleUserInfo(tokens.access_token);

  let userRow = await findUserByGoogleSub(c.env.DB, googleUser.sub);
  if (!userRow) {
    userRow = await createUser(c.env.DB, {
      googleSub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      pictureUrl: googleUser.picture,
    });
  }

  await writeSessionCookie(c, c.env.SESSION_SECRET, userRow.id);

  return c.redirect(c.env.WEB_APP_URL);
});

/**
 * E2Eテスト専用のログインバイパス。Google OAuthを経由せず、指定したメールアドレスの
 * ユーザーで直接セッションを発行する。E2E_TEST_AUTH="1" が設定されている環境でのみ
 * 有効（本番の wrangler.toml / secrets には絶対に設定しない）。未設定時はルート自体が
 * 存在しないかのように 404 を返す（本番で誤って有効化された場合でも、探索されただけで
 * 存在を悟られないようにするため）。
 */
auth.post("/test-login", async (c) => {
  if (c.env.E2E_TEST_AUTH !== "1") {
    return c.notFound();
  }

  const body = await c.req.json().catch(() => null);
  const email = body && typeof body === "object" ? (body as { email?: unknown }).email : null;
  if (typeof email !== "string" || !email) {
    return c.json({ error: "invalid_request" }, 400);
  }

  const googleSub = `e2e-test:${email}`;
  let userRow = await findUserByGoogleSub(c.env.DB, googleSub);
  if (!userRow) {
    userRow = await createUser(c.env.DB, {
      googleSub,
      email,
      name: "E2E Test User",
      pictureUrl: null,
    });
  }

  await writeSessionCookie(c, c.env.SESSION_SECRET, userRow.id);

  return c.json(toPublicUser(userRow));
});

auth.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.body(null, 204);
});

auth.get("/me", requireAuth, (c) => {
  return c.json(c.get("user"));
});

export default auth;
