import { getUserSettings, updateUserSettings } from "../userSettingsApi";

const API_BASE_URL = "http://localhost:8787";

describe("userSettingsApi", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("gets the current settings", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ theme: "dark" }) });
    const result = await getUserSettings(API_BASE_URL);
    expect(result).toEqual({ theme: "dark" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/user-settings`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("updates the theme", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ theme: "light" }) });
    await updateUserSettings(API_BASE_URL, { theme: "light" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/user-settings`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ theme: "light" }) }),
    );
  });
});
