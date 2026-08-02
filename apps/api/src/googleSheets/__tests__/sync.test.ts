import app from "../../index";
import { encryptSecret } from "../../crypto";
import { loginAsTestUser, mockGoogleOAuth } from "../../testing/authHelpers";
import { createTestEnv } from "../../testing/testEnv";
import { updateGoogleSheetsConfig, upsertGoogleSheetsRefreshToken } from "../../db/googleSheets";
import { syncUserSheets } from "../sync";

type MetricResponse = { id: string };

/** ログインフロー（token/userinfo）とSheets同期（token refresh/values get/clear/update）の
 * 両方に応答するfetchモック。sheetValues を差し替えられるようにして返す。 */
function mockGoogleForSync(initialSheetValues: string[][]) {
  let sheetValues = initialSheetValues;
  const writeCalls: { url: string; body: unknown }[] = [];

  const spy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "fake-access-token", expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
    if (url.includes(":clear")) {
      return new Response("{}", { status: 200 });
    }
    if (init?.method === "PUT") {
      writeCalls.push({ url, body: init.body ? JSON.parse(init.body as string) : null });
      sheetValues = (JSON.parse(init.body as string) as { values: string[][] }).values;
      return new Response("{}", { status: 200 });
    }
    if (url.includes("/values/")) {
      return new Response(JSON.stringify({ values: sheetValues }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch to ${url}`);
  });

  return { spy, writeCalls, getSheetValues: () => sheetValues };
}

describe("syncUserSheets", () => {
  let env: ReturnType<typeof createTestEnv>;
  let cookie: string;
  let userId: string;
  let weightMetricId: string;

  beforeEach(async () => {
    env = createTestEnv();
    mockGoogleOAuth();
    cookie = await loginAsTestUser(env);
    jest.restoreAllMocks();

    const meRes = await app.request("/api/auth/me", { headers: { Cookie: cookie } }, env);
    userId = ((await meRes.json()) as { id: string }).id;

    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const metricRes = await app.request(
      "/api/metrics",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "体重", type: "number", unit: "kg" }),
      },
      env,
    );
    weightMetricId = ((await metricRes.json()) as MetricResponse).id;

    const encryptedToken = await encryptSecret("fake-refresh-token", env.SESSION_SECRET);
    await upsertGoogleSheetsRefreshToken(env.DB, userId, encryptedToken);
    await updateGoogleSheetsConfig(env.DB, userId, {
      spreadsheetId: "sheet-id",
      sheetName: "logue",
      syncEnabled: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does nothing when there is no connection configured", async () => {
    const env2 = createTestEnv();
    const result = await syncUserSheets(env2, "no-such-user");
    expect(result).toEqual({ ok: true, issues: [] });
  });

  it("pulls a sheet-only value into the app on first sync", async () => {
    mockGoogleForSync([
      ["日付", "体重（kg）"],
      ["2026-07-01", "70"],
    ]);

    const result = await syncUserSheets(env, userId);
    expect(result.ok).toBe(true);

    const entriesRes = await app.request("/api/entries", { headers: { Cookie: cookie } }, env);
    const entries = (await entriesRes.json()) as {
      metricId: string;
      value: string;
      recordedAt: string;
    }[];
    expect(entries).toContainEqual(
      expect.objectContaining({ metricId: weightMetricId, value: "70", recordedAt: "2026-07-01" }),
    );
  });

  it("pushes an app-only entry into the sheet", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ metricId: weightMetricId, value: "71", recordedAt: "2026-07-02" }),
      },
      env,
    );

    const { getSheetValues } = mockGoogleForSync([["日付", "体重（kg）"]]);

    const result = await syncUserSheets(env, userId);
    expect(result.ok).toBe(true);
    expect(getSheetValues()).toEqual(expect.arrayContaining([["2026-07-02", "71"]]));
  });

  it("prefers the sheet value on a same-cell conflict, and does not re-touch it on the next sync", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ metricId: weightMetricId, value: "70", recordedAt: "2026-07-01" }),
      },
      env,
    );
    // 1回目の同期でスナップショットを "70" にする
    mockGoogleForSync([
      ["日付", "体重（kg）"],
      ["2026-07-01", "70"],
    ]);
    await syncUserSheets(env, userId);
    jest.restoreAllMocks();

    // アプリ側は71、シート側は73に食い違って変更された状態で2回目の同期
    await app.request(
      "/api/entries",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ metricId: weightMetricId, value: "71", recordedAt: "2026-07-01" }),
      },
      env,
    );
    mockGoogleOAuth();
    mockGoogleForSync([
      ["日付", "体重（kg）"],
      ["2026-07-01", "73"],
    ]);

    const result = await syncUserSheets(env, userId);
    expect(result.ok).toBe(true);

    const entriesRes = await app.request("/api/entries", { headers: { Cookie: cookie } }, env);
    const entries = (await entriesRes.json()) as { value: string; recordedAt: string }[];
    expect(entries.find((e) => e.recordedAt === "2026-07-01")?.value).toBe("73");
  });

  it("records last_error and does not throw when the sheet is unreachable", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "fake-access-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    const result = await syncUserSheets(env, userId);
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toContain("Google Sheets API");
  });
});
