import app from "../../index";
import { loginAsTestUser, mockGoogleOAuth } from "../../testing/authHelpers";
import { createTestEnv } from "../../testing/testEnv";

type MetricResponse = {
  id: string;
  type: string;
  choiceOptions: { id: string; label: string }[];
};
type EntryResponse = { id: string; metricId: string; value: string; recordedAt: string };

async function createMetric(
  env: ReturnType<typeof createTestEnv>,
  cookie: string,
  body: Record<string, unknown>,
): Promise<MetricResponse> {
  const res = await app.request(
    "/api/metrics",
    {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
  return (await res.json()) as MetricResponse;
}

describe("/api/entries", () => {
  let env: ReturnType<typeof createTestEnv>;
  let cookie: string;
  let numberMetric: MetricResponse;
  let choiceMetric: MetricResponse;

  beforeEach(async () => {
    env = createTestEnv();
    mockGoogleOAuth();
    cookie = await loginAsTestUser(env);
    numberMetric = await createMetric(env, cookie, { name: "体重", type: "number", unit: "kg" });
    choiceMetric = await createMetric(env, cookie, {
      name: "体調",
      type: "choice",
      choiceOptions: [{ label: "良い" }, { label: "悪い" }],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires authentication", async () => {
    const res = await app.request("/api/entries", {}, env);
    expect(res.status).toBe(401);
  });

  it("creates a number entry", async () => {
    const res = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: numberMetric.id,
          value: "70.5",
          recordedAt: "2026-07-20",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ value: "70.5", recordedAt: "2026-07-20" });
  });

  it("rejects a non-numeric value for a number metric", async () => {
    const res = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: numberMetric.id,
          value: "not-a-number",
          recordedAt: "2026-07-20",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("accepts a valid choice option id and rejects an unknown one", async () => {
    const validOptionId = choiceMetric.choiceOptions[0]?.id ?? "";
    const okRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: choiceMetric.id,
          value: validOptionId,
          recordedAt: "2026-07-20",
        }),
      },
      env,
    );
    expect(okRes.status).toBe(201);

    const badRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: choiceMetric.id,
          value: "unknown-option",
          recordedAt: "2026-07-20",
        }),
      },
      env,
    );
    expect(badRes.status).toBe(400);
  });

  it("rejects an entry for a metric that does not belong to the user", async () => {
    const res = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ metricId: "unknown-metric", value: "1", recordedAt: "2026-07-20" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("posting the same metric/day twice updates the existing entry instead of duplicating it", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const firstRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metricId: numberMetric.id,
          value: "70.0",
          recordedAt: "2026-07-20",
        }),
      },
      env,
    );
    expect(firstRes.status).toBe(201);
    const first = (await firstRes.json()) as EntryResponse;

    const secondRes = await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metricId: numberMetric.id,
          value: "71.2",
          recordedAt: "2026-07-20",
        }),
      },
      env,
    );
    expect(secondRes.status).toBe(200);
    const second = (await secondRes.json()) as EntryResponse;
    expect(second.id).toBe(first.id);
    expect(second.value).toBe("71.2");

    const listRes = await app.request(
      `/api/entries?metricId=${numberMetric.id}&from=2026-07-20&to=2026-07-20`,
      { headers: { Cookie: cookie } },
      env,
    );
    const listed = (await listRes.json()) as EntryResponse[];
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ value: "71.2" });
  });

  it("lists, filters by date range, updates and deletes entries", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    for (const recordedAt of ["2026-07-01", "2026-07-10", "2026-07-20"]) {
      await app.request(
        "/api/entries",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ metricId: numberMetric.id, value: "70", recordedAt }),
        },
        env,
      );
    }

    const listRes = await app.request(
      `/api/entries?metricId=${numberMetric.id}&from=2026-07-05&to=2026-07-15`,
      { headers: { Cookie: cookie } },
      env,
    );
    const listed = (await listRes.json()) as EntryResponse[];
    expect(listed.map((e) => e.recordedAt)).toEqual(["2026-07-10"]);

    const target = listed[0]!;
    const patchRes = await app.request(
      `/api/entries/${target.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ value: "72" }) },
      env,
    );
    expect(await patchRes.json()).toMatchObject({ value: "72" });

    const deleteRes = await app.request(
      `/api/entries/${target.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deleteRes.status).toBe(204);

    const missingPatch = await app.request(
      `/api/entries/${target.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ value: "1" }) },
      env,
    );
    expect(missingPatch.status).toBe(404);
  });
});
