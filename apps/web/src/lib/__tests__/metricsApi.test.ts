import {
  createMetric,
  deleteMetric,
  listMetrics,
  reorderMetrics,
  updateMetric,
} from "../metricsApi";

const API_BASE_URL = "http://localhost:8787";

describe("metricsApi", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("lists metrics", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listMetrics(API_BASE_URL);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metrics`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("creates a metric", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await createMetric(API_BASE_URL, { name: "体重", type: "number" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metrics`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "体重", type: "number" }),
      }),
    );
  });

  it("updates a metric", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await updateMetric(API_BASE_URL, "m1", { isArchived: true });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metrics/m1`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deletes a metric", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    await deleteMetric(API_BASE_URL, "m1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metrics/m1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("reorders metrics", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await reorderMetrics(API_BASE_URL, ["m2", "m1"]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metrics/reorder`,
      expect.objectContaining({ body: JSON.stringify({ orderedIds: ["m2", "m1"] }) }),
    );
  });
});
