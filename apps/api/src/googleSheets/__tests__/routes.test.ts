import app from "../../index";
import { loginAsTestUser, mockGoogleOAuth } from "../../testing/authHelpers";
import { createTestEnv } from "../../testing/testEnv";

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0] ?? "";
}

function findSetCookie(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

type SheetsFetchOptions = {
  refreshToken?: string;
  sheetValues?: string[][];
};

/** ログイン（token/userinfo）、スプレッドシート連携の同意フロー（token交換）、
 * Sheets API 呼び出しに応答するfetchモック。revoke呼び出しの記録も行う。 */
function mockGoogleForSheets(options: SheetsFetchOptions = {}) {
  const revokeCalls: string[] = [];
  const spy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.startsWith("https://oauth2.googleapis.com/revoke")) {
      const body = new URLSearchParams((init?.body as string) ?? "");
      revokeCalls.push(body.get("token") ?? "");
      return new Response("{}", { status: 200 });
    }
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return new Response(
        JSON.stringify({
          access_token: "fake-access-token",
          refresh_token: options.refreshToken,
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
      return new Response(
        JSON.stringify({
          sub: "google-sub-1",
          email: "taro@example.com",
          name: "Taro",
          picture: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes(":clear") || (init?.method === "PUT" && url.includes("/values/"))) {
      return new Response("{}", { status: 200 });
    }
    if (url.includes("/values/")) {
      return new Response(JSON.stringify({ values: options.sheetValues ?? [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch to ${url}`);
  });
  return { spy, revokeCalls };
}

describe("/api/sheets", () => {
  let env: ReturnType<typeof createTestEnv>;
  let cookie: string;

  beforeEach(async () => {
    env = createTestEnv();
    mockGoogleOAuth();
    cookie = await loginAsTestUser(env);
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires authentication on every endpoint", async () => {
    for (const req of [
      () => app.request("/api/sheets", {}, env),
      () => app.request("/api/sheets", { method: "PATCH" }, env),
      () => app.request("/api/sheets/sync", { method: "POST" }, env),
      () => app.request("/api/sheets", { method: "DELETE" }, env),
    ]) {
      const res = await req();
      expect(res.status).toBe(401);
    }
  });

  it("reports not connected before any connect flow has completed", async () => {
    const res = await app.request("/api/sheets", { headers: { Cookie: cookie } }, env);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("redirects to Google with the spreadsheets scope and offline/consent params", async () => {
    const res = await app.request("/api/sheets/connect", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("Location") ?? "");
    expect(location.searchParams.get("scope")).toBe(
      "openid email profile https://www.googleapis.com/auth/spreadsheets",
    );
    expect(location.searchParams.get("access_type")).toBe("offline");
    expect(location.searchParams.get("prompt")).toBe("consent");
    expect(findSetCookie(res, "logue_sheets_oauth")).toBeDefined();
  });

  async function connect(refreshToken: string | undefined) {
    mockGoogleForSheets({ refreshToken });
    const connectRes = await app.request(
      "/api/sheets/connect",
      { headers: { Cookie: cookie } },
      env,
    );
    const location = new URL(connectRes.headers.get("Location") ?? "");
    const state = location.searchParams.get("state") ?? "";
    const stateCookie = findSetCookie(connectRes, "logue_sheets_oauth");
    const stateCookieHeader = stateCookie ? cookiePair(stateCookie) : "";

    return app.request(
      `/api/sheets/callback?code=fake-code&state=${state}`,
      { headers: { Cookie: `${cookie}; ${stateCookieHeader}` } },
      env,
    );
  }

  it("stores the connection and redirects to settings on a successful callback", async () => {
    const callbackRes = await connect("fake-refresh-token");
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.get("Location")).toBe(`${env.WEB_APP_URL}/settings?sheets=connected`);

    const statusRes = await app.request("/api/sheets", { headers: { Cookie: cookie } }, env);
    expect(await statusRes.json()).toMatchObject({ connected: true, syncEnabled: false });
  });

  it("redirects with a distinct status when Google doesn't return a refresh_token", async () => {
    const callbackRes = await connect(undefined);
    expect(callbackRes.headers.get("Location")).toBe(
      `${env.WEB_APP_URL}/settings?sheets=no_refresh_token`,
    );
  });

  it("updates spreadsheetId (extracted from a pasted URL), sheetName, and syncEnabled", async () => {
    await connect("fake-refresh-token");
    const res = await app.request(
      "/api/sheets",
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: "https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=0",
          sheetName: "記録",
          syncEnabled: true,
        }),
      },
      env,
    );
    expect(await res.json()).toMatchObject({
      connected: true,
      spreadsheetId: "abc123XYZ",
      sheetName: "記録",
      syncEnabled: true,
    });
  });

  it("rejects PATCH before a connection exists", async () => {
    const res = await app.request(
      "/api/sheets",
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: "abc" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a manual sync before a spreadsheet is configured", async () => {
    await connect("fake-refresh-token");
    const res = await app.request(
      "/api/sheets/sync",
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("runs a sync on demand and reports the result", async () => {
    await connect("fake-refresh-token");
    await app.request(
      "/api/sheets",
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: "sheet-id", sheetName: "logue" }),
      },
      env,
    );

    mockGoogleForSheets({ sheetValues: [] });
    const res = await app.request(
      "/api/sheets/sync",
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; lastSyncedAt: string | null };
    expect(body.ok).toBe(true);
    expect(body.lastSyncedAt).not.toBeNull();
  });

  it("revokes the refresh token and deletes the connection on disconnect", async () => {
    await connect("token-to-revoke");
    const { revokeCalls } = mockGoogleForSheets();

    const res = await app.request(
      "/api/sheets",
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(204);
    expect(revokeCalls).toEqual(["token-to-revoke"]);

    const statusRes = await app.request("/api/sheets", { headers: { Cookie: cookie } }, env);
    expect(await statusRes.json()).toEqual({ connected: false });
  });
});
