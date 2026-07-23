import app from "../../index";
import { createTestEnv } from "../../testing/testEnv";

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0] ?? "";
}

function findSetCookie(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

const GOOGLE_USER = {
  sub: "google-sub-123",
  email: "taro@example.com",
  name: "Taro Yamada",
  picture: "https://example.com/taro.png",
};

describe("Google OAuth flow", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "fake-access-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
        return new Response(JSON.stringify(GOOGLE_USER), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  async function login(env: ReturnType<typeof createTestEnv>) {
    const res = await app.request("/api/auth/login", {}, env);
    const location = new URL(res.headers.get("Location") ?? "");
    const state = location.searchParams.get("state") ?? "";
    const oauthCookie = findSetCookie(res, "logue_oauth");
    return { state, oauthCookieHeader: oauthCookie ? cookiePair(oauthCookie) : "" };
  }

  it("redirects to Google with PKCE params and a state cookie", async () => {
    const env = createTestEnv();
    const res = await app.request("/api/auth/login", {}, env);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("Location") ?? "");
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(findSetCookie(res, "logue_oauth")).toBeDefined();
  });

  it("creates a user and issues a session cookie on callback, then serves /api/auth/me", async () => {
    const env = createTestEnv();
    const { state, oauthCookieHeader } = await login(env);

    const callbackRes = await app.request(
      `/api/auth/callback?code=fake-code&state=${state}`,
      { headers: { Cookie: oauthCookieHeader } },
      env,
    );

    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.get("Location")).toBe(env.WEB_ORIGIN);
    const sessionCookie = findSetCookie(callbackRes, "logue_session");
    expect(sessionCookie).toBeDefined();

    const meRes = await app.request(
      "/api/auth/me",
      { headers: { Cookie: cookiePair(sessionCookie ?? "") } },
      env,
    );
    expect(meRes.status).toBe(200);
    expect(await meRes.json()).toEqual({
      id: expect.any(String),
      email: GOOGLE_USER.email,
      name: GOOGLE_USER.name,
      pictureUrl: GOOGLE_USER.picture,
    });
  });

  it("rejects a callback whose state does not match the cookie", async () => {
    const env = createTestEnv();
    const { oauthCookieHeader } = await login(env);

    const res = await app.request(
      "/api/auth/callback?code=fake-code&state=wrong-state",
      { headers: { Cookie: oauthCookieHeader } },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("rejects /api/auth/me without a session cookie", async () => {
    const env = createTestEnv();
    const res = await app.request("/api/auth/me", {}, env);
    expect(res.status).toBe(401);
  });

  it("clears the session cookie on logout", async () => {
    const env = createTestEnv();
    const res = await app.request("/api/auth/logout", { method: "POST" }, env);
    expect(res.status).toBe(204);
    const cleared = findSetCookie(res, "logue_session");
    expect(cleared).toMatch(/Max-Age=0/);
  });
});
