import app from "../index";
import { createTestEnv } from "../testing/testEnv";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await app.request("/api/health", {}, createTestEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
