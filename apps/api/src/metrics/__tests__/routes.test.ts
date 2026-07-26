import app from "../../index";
import { loginAsTestUser, mockGoogleOAuth } from "../../testing/authHelpers";
import { createTestEnv } from "../../testing/testEnv";

type MetricResponse = {
  id: string;
  metricGroupId: string | null;
  name: string;
  type: string;
  unit: string | null;
  sortOrder: number;
  isArchived: boolean;
  choiceOptions: { id: string; label: string; sortOrder: number }[];
};

describe("/api/metrics", () => {
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
    const res = await app.request("/api/metrics", {}, env);
    expect(res.status).toBe(401);
  });

  it("creates a number metric", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const res = await app.request(
      "/api/metrics",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "体重", type: "number", unit: "kg" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as MetricResponse;
    expect(body).toMatchObject({
      name: "体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
      isArchived: false,
      choiceOptions: [],
    });
  });

  it("requires choiceOptions when creating a choice metric", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const res = await app.request(
      "/api/metrics",
      { method: "POST", headers, body: JSON.stringify({ name: "体調", type: "choice" }) },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("creates a choice metric with choice options", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const res = await app.request(
      "/api/metrics",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "体調",
          type: "choice",
          choiceOptions: [{ label: "良い" }, { label: "普通" }, { label: "悪い" }],
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as MetricResponse;
    expect(body.choiceOptions.map((o) => o.label)).toEqual(["良い", "普通", "悪い"]);
  });

  it("updates choice options and rejects them for non-choice metrics", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const createRes = await app.request(
      "/api/metrics",
      { method: "POST", headers, body: JSON.stringify({ name: "体重", type: "number" }) },
      env,
    );
    const created = (await createRes.json()) as MetricResponse;

    const rejectRes = await app.request(
      `/api/metrics/${created.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ choiceOptions: [{ label: "良い" }] }),
      },
      env,
    );
    expect(rejectRes.status).toBe(400);

    const archiveRes = await app.request(
      `/api/metrics/${created.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ isArchived: true }) },
      env,
    );
    expect(archiveRes.status).toBe(200);
    expect(await archiveRes.json()).toMatchObject({ isArchived: true });
  });

  it("reorders metrics", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const first = (await (
      await app.request(
        "/api/metrics",
        { method: "POST", headers, body: JSON.stringify({ name: "a", type: "text" }) },
        env,
      )
    ).json()) as MetricResponse;
    const second = (await (
      await app.request(
        "/api/metrics",
        { method: "POST", headers, body: JSON.stringify({ name: "b", type: "text" }) },
        env,
      )
    ).json()) as MetricResponse;

    const reorderRes = await app.request(
      "/api/metrics/reorder",
      { method: "PUT", headers, body: JSON.stringify({ orderedIds: [second.id, first.id] }) },
      env,
    );
    const reordered = (await reorderRes.json()) as MetricResponse[];
    expect(reordered.map((m) => m.name)).toEqual(["b", "a"]);
  });

  it("deletes a metric and returns 404 for a missing one", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const created = (await (
      await app.request(
        "/api/metrics",
        { method: "POST", headers, body: JSON.stringify({ name: "体重", type: "number" }) },
        env,
      )
    ).json()) as MetricResponse;

    const deleteRes = await app.request(
      `/api/metrics/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deleteRes.status).toBe(204);

    const secondDelete = await app.request(
      `/api/metrics/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(secondDelete.status).toBe(404);
  });
});
