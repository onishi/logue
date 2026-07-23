import app from "../index";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
