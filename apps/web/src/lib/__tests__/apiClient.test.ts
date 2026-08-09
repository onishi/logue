import { apiFetch } from "../apiClient";

describe("apiFetch", () => {
  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("always includes credentials and the CSRF marker header", async () => {
    // jsdom は Response を実装していないため、apiFetch が結果を素通しするだけの値でスタブする
    const fetchMock = jest.fn().mockResolvedValue({ status: 200 });
    globalThis.fetch = fetchMock;

    await apiFetch("http://localhost:8787", "/api/entries");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/api/entries",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ "X-Logue-Client": "web" }),
      }),
    );
  });

  it("merges the CSRF header with any headers already passed in", async () => {
    // jsdom は Response を実装していないため、apiFetch が結果を素通しするだけの値でスタブする
    const fetchMock = jest.fn().mockResolvedValue({ status: 200 });
    globalThis.fetch = fetchMock;

    await apiFetch("http://localhost:8787", "/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/api/entries",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Logue-Client": "web",
        }),
      }),
    );
  });
});
