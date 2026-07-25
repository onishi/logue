import {
  createMetricGroup,
  deleteMetricGroup,
  listMetricGroups,
  reorderMetricGroups,
  updateMetricGroup,
} from "../metricGroupsApi";

const API_BASE_URL = "http://localhost:8787";

describe("metricGroupsApi", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("lists metric groups", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: "g1", name: "体組成", sortOrder: 0 }],
    });
    const result = await listMetricGroups(API_BASE_URL);
    expect(result).toEqual([{ id: "g1", name: "体組成", sortOrder: 0 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metric-groups`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("creates a metric group with a JSON body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "g1", name: "体組成", sortOrder: 0 }),
    });
    await createMetricGroup(API_BASE_URL, { name: "体組成" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metric-groups`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name: "体組成" }),
      }),
    );
  });

  it("updates a metric group by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "g1", name: "からだ", sortOrder: 0 }),
    });
    await updateMetricGroup(API_BASE_URL, "g1", { name: "からだ" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metric-groups/g1`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deletes a metric group by id", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    await deleteMetricGroup(API_BASE_URL, "g1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metric-groups/g1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("reorders metric groups", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await reorderMetricGroups(API_BASE_URL, ["g2", "g1"]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/metric-groups/reorder`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ orderedIds: ["g2", "g1"] }),
      }),
    );
  });

  it("throws when the API responds with a non-ok status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(listMetricGroups(API_BASE_URL)).rejects.toThrow(/500/);
  });
});
