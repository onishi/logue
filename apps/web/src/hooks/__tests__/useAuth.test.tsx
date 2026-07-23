import { act, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "../useAuth";

const API_BASE_URL = "http://localhost:8787";
const USER = { id: "user-1", email: "taro@example.com", name: "Taro", pictureUrl: null };

describe("useAuth", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("becomes unauthenticated when /api/auth/me responds with 401", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    const { result } = renderHook(() => useAuth(API_BASE_URL));

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/auth/me`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("becomes authenticated with the user returned by /api/auth/me", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => USER });

    const { result } = renderHook(() => useAuth(API_BASE_URL));

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current).toMatchObject({ status: "authenticated", user: USER });
  });

  it("logout() calls /api/auth/logout and resets to unauthenticated", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => USER });
    const { result } = renderHook(() => useAuth(API_BASE_URL));
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe("unauthenticated");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/auth/logout`,
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});
