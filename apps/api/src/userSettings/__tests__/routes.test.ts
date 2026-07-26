import app from "../../index";
import { loginAsTestUser, mockGoogleOAuth } from "../../testing/authHelpers";
import { createTestEnv } from "../../testing/testEnv";

describe("/api/user-settings", () => {
  let env: ReturnType<typeof createTestEnv>;
  let cookie: string;

  beforeEach(async () => {
    env = createTestEnv();
    mockGoogleOAuth();
    cookie = await loginAsTestUser(env);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires authentication", async () => {
    const res = await app.request("/api/user-settings", {}, env);
    expect(res.status).toBe(401);
  });

  it("defaults to system theme before any settings are saved", async () => {
    const res = await app.request("/api/user-settings", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ theme: "system" });
  });

  it("updates and persists the theme", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const patchRes = await app.request(
      "/api/user-settings",
      { method: "PATCH", headers, body: JSON.stringify({ theme: "dark" }) },
      env,
    );
    expect(patchRes.status).toBe(200);
    expect(await patchRes.json()).toEqual({ theme: "dark" });

    const getRes = await app.request("/api/user-settings", { headers: { Cookie: cookie } }, env);
    expect(await getRes.json()).toEqual({ theme: "dark" });
  });

  it("stores 'system' as no explicit theme and rejects invalid values", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    await app.request(
      "/api/user-settings",
      { method: "PATCH", headers, body: JSON.stringify({ theme: "dark" }) },
      env,
    );
    const backToSystem = await app.request(
      "/api/user-settings",
      { method: "PATCH", headers, body: JSON.stringify({ theme: "system" }) },
      env,
    );
    expect(await backToSystem.json()).toEqual({ theme: "system" });

    const invalid = await app.request(
      "/api/user-settings",
      { method: "PATCH", headers, body: JSON.stringify({ theme: "blue" }) },
      env,
    );
    expect(invalid.status).toBe(400);
  });
});
