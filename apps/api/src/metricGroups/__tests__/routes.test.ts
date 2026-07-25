import app from "../../index";
import { loginAsTestUser, mockGoogleOAuth } from "../../testing/authHelpers";
import { createTestEnv } from "../../testing/testEnv";

describe("/api/metric-groups", () => {
  let env: ReturnType<typeof createTestEnv>;
  let cookie: string;

  beforeEach(async () => {
    env = createTestEnv();
    const { setUser } = mockGoogleOAuth();
    setUser({ sub: "google-sub-1", email: "taro@example.com", name: "Taro", picture: null });
    cookie = await loginAsTestUser(env);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires authentication", async () => {
    const res = await app.request("/api/metric-groups", {}, env);
    expect(res.status).toBe(401);
  });

  it("creates, lists, updates, reorders and deletes metric groups", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };

    const createRes = await app.request(
      "/api/metric-groups",
      { method: "POST", headers, body: JSON.stringify({ name: "体組成" }) },
      env,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; name: string; sortOrder: number };
    expect(created).toMatchObject({ name: "体組成", sortOrder: 0 });

    const created2Res = await app.request(
      "/api/metric-groups",
      { method: "POST", headers, body: JSON.stringify({ name: "食事" }) },
      env,
    );
    const created2 = (await created2Res.json()) as { id: string };

    const listRes = await app.request("/api/metric-groups", { headers: { Cookie: cookie } }, env);
    expect(await listRes.json()).toEqual([
      { id: created.id, name: "体組成", sortOrder: 0 },
      { id: created2.id, name: "食事", sortOrder: 1 },
    ]);

    const patchRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ name: "からだ" }) },
      env,
    );
    expect(patchRes.status).toBe(200);
    expect(await patchRes.json()).toMatchObject({ name: "からだ" });

    const reorderRes = await app.request(
      "/api/metric-groups/reorder",
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ orderedIds: [created2.id, created.id] }),
      },
      env,
    );
    expect(await reorderRes.json()).toEqual([
      { id: created2.id, name: "食事", sortOrder: 0 },
      { id: created.id, name: "からだ", sortOrder: 1 },
    ]);

    const deleteRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deleteRes.status).toBe(204);

    const notFoundDelete = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(notFoundDelete.status).toBe(404);
  });

  it("rejects invalid create payloads", async () => {
    const res = await app.request(
      "/api/metric-groups",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "{}",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("cannot update or delete another user's metric group", async () => {
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    const createRes = await app.request(
      "/api/metric-groups",
      { method: "POST", headers, body: JSON.stringify({ name: "体組成" }) },
      env,
    );
    const created = (await createRes.json()) as { id: string };

    const { setUser } = mockGoogleOAuth();
    setUser({ sub: "google-sub-2", email: "hanako@example.com", name: "Hanako", picture: null });
    const otherCookie = await loginAsTestUser(env);

    const patchRes = await app.request(
      `/api/metric-groups/${created.id}`,
      {
        method: "PATCH",
        headers: { Cookie: otherCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "乗っ取り" }),
      },
      env,
    );
    expect(patchRes.status).toBe(404);

    const deleteRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "DELETE", headers: { Cookie: otherCookie } },
      env,
    );
    expect(deleteRes.status).toBe(404);
  });
});
