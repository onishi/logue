import app from "../../index";
import { createAuthenticatedTestContext } from "../../testing/authenticatedEnv";
import { createAuthCookieHeader } from "../../testing/auth";
import { createTestUser } from "../../testing/fixtures";

describe("/api/metric-groups", () => {
  it("requires authentication", async () => {
    const { env } = await createAuthenticatedTestContext();
    const res = await app.request("/api/metric-groups", {}, env);
    expect(res.status).toBe(401);
  });

  it("creates, lists, updates and deletes a metric group", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };

    const createRes = await app.request(
      "/api/metric-groups",
      { method: "POST", headers, body: JSON.stringify({ name: "体組成" }) },
      env,
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toMatchObject({ name: "体組成", sortOrder: 0 });

    const listRes = await app.request("/api/metric-groups", { headers: { Cookie: cookie } }, env);
    expect(await listRes.json()).toEqual([created]);

    const updateRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ name: "からだ" }) },
      env,
    );
    expect(updateRes.status).toBe(200);
    expect(await updateRes.json()).toMatchObject({ name: "からだ" });

    const deleteRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await app.request(
      "/api/metric-groups",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(await listAfterDelete.json()).toEqual([]);
  });

  it("rejects invalid input and unknown ids", async () => {
    const { env, cookie } = await createAuthenticatedTestContext();
    const headers = { Cookie: cookie, "Content-Type": "application/json" };

    const invalidRes = await app.request(
      "/api/metric-groups",
      { method: "POST", headers, body: JSON.stringify({ name: "" }) },
      env,
    );
    expect(invalidRes.status).toBe(400);

    const notFoundRes = await app.request(
      "/api/metric-groups/does-not-exist",
      { method: "PATCH", headers, body: JSON.stringify({ name: "x" }) },
      env,
    );
    expect(notFoundRes.status).toBe(404);
  });

  it("does not expose another user's metric groups", async () => {
    const owner = await createAuthenticatedTestContext();
    const headers = { Cookie: owner.cookie, "Content-Type": "application/json" };
    const createRes = await app.request(
      "/api/metric-groups",
      { method: "POST", headers, body: JSON.stringify({ name: "体組成" }) },
      owner.env,
    );
    const created = await createRes.json();

    // 同じ DB 内に別ユーザーを作り、そのユーザーのセッションで所有者のグループへアクセスを試みる
    const strangerId = await createTestUser(owner.env.DB);
    const strangerCookie = await createAuthCookieHeader(owner.env.SESSION_SECRET, strangerId);
    const strangerRes = await app.request(
      `/api/metric-groups/${created.id}`,
      { method: "DELETE", headers: { Cookie: strangerCookie } },
      owner.env,
    );
    expect(strangerRes.status).toBe(404);
  });
});
