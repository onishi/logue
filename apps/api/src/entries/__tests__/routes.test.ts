import app from "../../index";
import { createAuthenticatedTestContext } from "../../testing/authenticatedEnv";
import { createAuthCookieHeader } from "../../testing/auth";
import { createTestUser } from "../../testing/fixtures";

type TestContext = Awaited<ReturnType<typeof createAuthenticatedTestContext>>;

async function createMetric(env: TestContext["env"], cookie: string, body: unknown) {
  const res = await app.request(
    "/api/metrics",
    {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
  return res.json();
}

describe("/api/entries", () => {
  it("requires authentication", async () => {
    const { env } = await createAuthenticatedTestContext();
    const res = await app.request("/api/entries", {}, env);
    expect(res.status).toBe(401);
  });

  it("creates a numeric entry and lists it", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const metric = await createMetric(env, cookie, { name: "体重", valueType: "number" });

    const createRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metricId: metric.id,
          valueNumber: 65.5,
          recordedAt: "2026-07-01T00:00:00.000Z",
        }),
      },
      env,
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toMatchObject({ metricId: metric.id, valueNumber: 65.5, valueText: null });

    const listRes = await app.request("/api/entries", { headers: { Cookie: cookie } }, env);
    expect(await listRes.json()).toEqual([created]);
  });

  it("rejects a numeric entry missing valueNumber", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const metric = await createMetric(env, cookie, { name: "体重", valueType: "number" });

    const res = await app.request(
      "/api/entries",
      { method: "POST", headers, body: JSON.stringify({ metricId: metric.id, valueText: "65kg" }) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a choice entry whose value isn't one of the metric's options", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const metric = await createMetric(env, cookie, {
      name: "気分",
      valueType: "choice",
      choiceOptions: ["良い", "悪い"],
    });

    const res = await app.request(
      "/api/entries",
      { method: "POST", headers, body: JSON.stringify({ metricId: metric.id, valueText: "普通" }) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("filters entries by metricId and date range", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const weight = await createMetric(env, cookie, { name: "体重", valueType: "number" });
    const mood = await createMetric(env, cookie, { name: "気分", valueType: "text" });

    await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metricId: weight.id,
          valueNumber: 65,
          recordedAt: "2026-07-01T00:00:00.000Z",
        }),
      },
      env,
    );
    await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metricId: mood.id,
          valueText: "普通",
          recordedAt: "2026-07-05T00:00:00.000Z",
        }),
      },
      env,
    );

    const byMetric = await app.request(
      `/api/entries?metricId=${weight.id}`,
      { headers: { Cookie: cookie } },
      env,
    );
    expect(await byMetric.json()).toHaveLength(1);

    const byFrom = await app.request(
      "/api/entries?from=2026-07-03T00:00:00.000Z",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(await byFrom.json()).toHaveLength(1);
  });

  it("updates and deletes an entry", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const metric = await createMetric(env, cookie, { name: "体重", valueType: "number" });
    const createRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metricId: metric.id,
          valueNumber: 65,
          recordedAt: "2026-07-01T00:00:00.000Z",
        }),
      },
      env,
    );
    const created = await createRes.json();

    const updateRes = await app.request(
      `/api/entries/${created.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ valueNumber: 64 }) },
      env,
    );
    expect(await updateRes.json()).toMatchObject({ valueNumber: 64 });

    const deleteRes = await app.request(
      `/api/entries/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deleteRes.status).toBe(204);

    const listRes = await app.request("/api/entries", { headers: { Cookie: cookie } }, env);
    expect(await listRes.json()).toEqual([]);
  });

  it("404s for an entry belonging to another user", async () => {
    const owner = await createAuthenticatedTestContext();
    const ownerHeaders = { Cookie: owner.cookie, "Content-Type": "application/json" };
    const metric = await createMetric(owner.env, owner.cookie, {
      name: "体重",
      valueType: "number",
    });
    const createRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers: ownerHeaders,
        body: JSON.stringify({ metricId: metric.id, valueNumber: 65 }),
      },
      owner.env,
    );
    const created = await createRes.json();

    const strangerId = await createTestUser(owner.env.DB);
    const strangerCookie = await createAuthCookieHeader(owner.env.SESSION_SECRET, strangerId);
    const res = await app.request(
      `/api/entries/${created.id}`,
      { method: "DELETE", headers: { Cookie: strangerCookie } },
      owner.env,
    );
    expect(res.status).toBe(404);
  });
});
