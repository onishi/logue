import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "../env";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCodeForTokens,
  revokeGoogleToken,
} from "../auth/google";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import {
  OAUTH_STATE_TTL_SECONDS,
  SHEETS_OAUTH_STATE_COOKIE_NAME,
  decodeOAuthStateCookie,
  encodeOAuthStateCookie,
} from "../auth/state";
import { decryptSecret, encryptSecret, randomToken, sha256Base64Url } from "../crypto";
import {
  deleteGoogleSheetsConnection,
  findGoogleSheetsConnection,
  updateGoogleSheetsConfig,
  upsertGoogleSheetsRefreshToken,
} from "../db/googleSheets";
import { syncUserSheets } from "./sync";

const SHEETS_SCOPE = "openid email profile https://www.googleapis.com/auth/spreadsheets";

const sheets = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

sheets.use("*", requireAuth);

function callbackRedirectUri(requestUrl: string): string {
  return new URL("/api/sheets/callback", requestUrl).toString();
}

/** URLで貼り付けられた場合（.../d/{id}/edit）にもIDだけを抜き出せるようにする。 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1]! : trimmed;
}

sheets.get("/connect", async (c) => {
  const state = randomToken(16);
  const codeVerifier = randomToken(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  setCookie(c, SHEETS_OAUTH_STATE_COOKIE_NAME, encodeOAuthStateCookie(state, codeVerifier), {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/api/sheets",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri: callbackRedirectUri(c.req.url),
    state,
    codeChallenge,
    scope: SHEETS_SCOPE,
    accessType: "offline",
    prompt: "consent",
  });

  return c.redirect(authorizationUrl);
});

sheets.get("/callback", async (c) => {
  const code = c.req.query("code");
  const returnedState = c.req.query("state");
  const stored = decodeOAuthStateCookie(getCookie(c, SHEETS_OAUTH_STATE_COOKIE_NAME));
  deleteCookie(c, SHEETS_OAUTH_STATE_COOKIE_NAME, { path: "/api/sheets" });

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

  if (!tokens.refresh_token) {
    return c.redirect(`${c.env.WEB_APP_URL}/settings?sheets=no_refresh_token`);
  }

  const encrypted = await encryptSecret(tokens.refresh_token, c.env.SESSION_SECRET);
  await upsertGoogleSheetsRefreshToken(c.env.DB, c.get("user").id, encrypted);

  return c.redirect(`${c.env.WEB_APP_URL}/settings?sheets=connected`);
});

sheets.get("/", async (c) => {
  const connection = await findGoogleSheetsConnection(c.env.DB, c.get("user").id);
  if (!connection) {
    return c.json({ connected: false });
  }
  return c.json({
    connected: true,
    spreadsheetId: connection.spreadsheet_id,
    sheetName: connection.sheet_name,
    syncEnabled: connection.sync_enabled === 1,
    lastSyncedAt: connection.last_synced_at,
    lastError: connection.last_error,
  });
});

sheets.patch("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "invalid_request" }, 400);
  }
  const { spreadsheetId, sheetName, syncEnabled } = body as {
    spreadsheetId?: string;
    sheetName?: string;
    syncEnabled?: boolean;
  };

  const existing = await findGoogleSheetsConnection(c.env.DB, c.get("user").id);
  if (!existing) {
    return c.json({ error: "not_connected" }, 400);
  }

  const updated = await updateGoogleSheetsConfig(c.env.DB, c.get("user").id, {
    spreadsheetId: spreadsheetId !== undefined ? extractSpreadsheetId(spreadsheetId) : undefined,
    sheetName: sheetName !== undefined ? sheetName.trim() || "logue" : undefined,
    syncEnabled,
  });
  if (!updated) {
    return c.json({ error: "not_connected" }, 400);
  }

  return c.json({
    connected: true,
    spreadsheetId: updated.spreadsheet_id,
    sheetName: updated.sheet_name,
    syncEnabled: updated.sync_enabled === 1,
    lastSyncedAt: updated.last_synced_at,
    lastError: updated.last_error,
  });
});

sheets.post("/sync", async (c) => {
  const userId = c.get("user").id;
  const existing = await findGoogleSheetsConnection(c.env.DB, userId);
  if (!existing || !existing.spreadsheet_id) {
    return c.json({ error: "not_connected" }, 400);
  }

  const result = await syncUserSheets(c.env, userId);
  const connection = await findGoogleSheetsConnection(c.env.DB, userId);
  return c.json({
    ok: result.ok,
    issues: result.issues,
    lastSyncedAt: connection?.last_synced_at ?? null,
    lastError: connection?.last_error ?? null,
  });
});

sheets.delete("/", async (c) => {
  const userId = c.get("user").id;
  const existing = await findGoogleSheetsConnection(c.env.DB, userId);
  if (existing) {
    try {
      const refreshToken = await decryptSecret(existing.refresh_token, c.env.SESSION_SECRET);
      await revokeGoogleToken(refreshToken);
    } catch {
      // 失効APIの呼び出しに失敗しても連携情報自体は削除する（ベストエフォート）
    }
  }
  await deleteGoogleSheetsConnection(c.env.DB, userId);
  return c.body(null, 204);
});

export default sheets;
