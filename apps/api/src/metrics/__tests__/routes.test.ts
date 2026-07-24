import app from "../../index";
import { createAuthenticatedTestContext } from "../../testing/authenticatedEnv";

async function createMetricViaApi(
  env: Awaited<ReturnType<typeof createAuthenticatedTestContext>>["env"],
  cookie: string,
  body: unknown,
) {
  const res = await app.request(
    "/api/metrics",
    {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
  return { res, json: await res.json() };
}

describe("/api/metrics", () => {
  it("requires authentication", async () => {
    const { env } = await createAuthenticatedTestContext();
    const res = await app.request("/api/metrics", {}, env);
    expect(res.status).toBe(401);
  });

  it("creates a number metric and lists it", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const { res, json } = await createMetricViaApi(env, cookie, {
      name: "体重",
      valueType: "number",
      unit: "kg",
    });

    expect(res.status).toBe(201);
    expect(json).toMatchObject({
      name: "体重",
      valueType: "number",
      unit: "kg",
      isArchived: false,
    });

    const listRes = await app.request("/api/metrics", { headers: { Cookie: cookie } }, env);
    expect(await listRes.json()).toEqual([json]);
  });

  it("rejects a choice metric without choice options", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const { res } = await createMetricViaApi(env, cookie, { name: "気分", valueType: "choice" });
    expect(res.status).toBe(400);
  });

  it("creates a choice metric with options and can replace them on update", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const { json: metric } = await createMetricViaApi(env, cookie, {
      name: "気分",
      valueType: "choice",
      choiceOptions: ["良い", "悪い"],
    });
    expect(metric.choiceOptions.map((o: { label: string }) => o.label)).toEqual(["良い", "悪い"]);

    const updateRes = await app.request(
      `/api/metrics/${metric.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ choiceOptions: ["最高", "最悪"] }) },
      env,
    );
    const updated = await updateRes.json();
    expect(updated.choiceOptions.map((o: { label: string }) => o.label)).toEqual(["最高", "最悪"]);
  });

  it("excludes archived metrics by default", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const { json: metric } = await createMetricViaApi(env, cookie, {
      name: "体重",
      valueType: "number",
    });

    await app.request(
      `/api/metrics/${metric.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ isArchived: true }) },
      env,
    );

    const listRes = await app.request("/api/metrics", { headers: { Cookie: cookie } }, env);
    expect(await listRes.json()).toEqual([]);

    const listAllRes = await app.request(
      "/api/metrics?includeArchived=true",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(await listAllRes.json()).toHaveLength(1);
  });

  it("refuses to delete a metric with entries but deletes an unused one", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const { json: metric } = await createMetricViaApi(env, cookie, {
      name: "体重",
      valueType: "number",
    });

    await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ metricId: metric.id, valueNumber: 65 }),
      },
      env,
    );

    const blockedRes = await app.request(
      `/api/metrics/${metric.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(blockedRes.status).toBe(409);

    const { json: unused } = await createMetricViaApi(env, cookie, {
      name: "空腹感",
      valueType: "text",
    });
    const deletedRes = await app.request(
      `/api/metrics/${unused.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deletedRes.status).toBe(204);
  });
});
