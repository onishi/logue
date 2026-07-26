import { act, renderHook, waitFor } from "@testing-library/react";
import { createMockApiServer } from "../../testing/mockApiServer";
import { useUserSettings } from "../useUserSettings";

const API_BASE_URL = "http://localhost:8787";

describe("useUserSettings", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("defaults to system theme and updates it", async () => {
    const { result } = renderHook(() => useUserSettings(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.settings).toEqual({ theme: "system" });

    await act(async () => {
      await result.current.setTheme("dark");
    });
    expect(result.current.settings).toEqual({ theme: "dark" });
    expect(server.userSettings).toEqual({ theme: "dark" });
  });

  it("optimistically applies the theme, then reverts and rethrows if the request fails", async () => {
    const { result } = renderHook(() => useUserSettings(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    (server.fetchMock as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) }),
    );

    await act(async () => {
      await expect(result.current.setTheme("dark")).rejects.toThrow();
    });

    expect(result.current.settings).toEqual({ theme: "system" });
  });
});
