import { createEntry, deleteEntry, listEntries, updateEntry } from "../entriesApi";

const API_BASE_URL = "http://localhost:8787";

describe("entriesApi", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("lists entries without filters", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listEntries(API_BASE_URL);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/entries`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("lists entries with metricId/from/to filters as query params", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    await listEntries(API_BASE_URL, { metricId: "m1", from: "2026-07-01", to: "2026-07-31" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/entries?metricId=m1&from=2026-07-01&to=2026-07-31`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("creates an entry", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await createEntry(API_BASE_URL, { metricId: "m1", value: "70", recordedAt: "2026-07-20" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/entries`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updates an entry", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await updateEntry(API_BASE_URL, "e1", { value: "71" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/entries/e1`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deletes an entry", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    await deleteEntry(API_BASE_URL, "e1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/entries/e1`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
