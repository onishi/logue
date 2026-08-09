import app from "../index";
import { CSRF_TEST_HEADERS, loginAsTestUser, mockGoogleOAuth } from "../testing/authHelpers";
import { createTestEnv } from "../testing/testEnv";

describe("requireCsrfHeader", () => {
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

  it("rejects a POST request that is missing the CSRF header", async () => {
    const res = await app.request(
      "/api/metric-groups",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "体組成" }),
      },
      env,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "missing_csrf_header" });
  });

  it("allows a POST request that includes the CSRF header", async () => {
    const res = await app.request(
      "/api/metric-groups",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json", ...CSRF_TEST_HEADERS },
        body: JSON.stringify({ name: "体組成" }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });

  it("does not require the header for GET requests", async () => {
    const res = await app.request("/api/metric-groups", { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
  });

  it("does not require the header for PATCH/DELETE (already protected by the CORS preflight)", async () => {
    const createRes = await app.request(
      "/api/metric-groups",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json", ...CSRF_TEST_HEADERS },
        body: JSON.stringify({ name: "体組成" }),
      },
      env,
    );
    const created = (await createRes.json()) as { id: string };

    const patchRes = await app.request(
      `/api/metric-groups/${created.id}`,
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "からだ" }),
      },
      env,
    );
    expect(patchRes.status).toBe(200);

    const deleteRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deleteRes.status).toBe(204);
  });

  it("exempts the login/health endpoints so a plain browser navigation still works", async () => {
    const healthRes = await app.request("/api/health", {}, env);
    expect(healthRes.status).toBe(200);

    const loginRes = await app.request("/api/auth/login", {}, env);
    expect(loginRes.status).toBe(302);
  });
});
