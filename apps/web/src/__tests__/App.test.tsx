import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";
import { createMockApiServer } from "../testing/mockApiServer";

const API_BASE_URL = "http://localhost:8787";

describe("App", () => {
  describe("unauthenticated", () => {
    beforeEach(() => {
      globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    });

    afterEach(() => {
      // @ts-expect-error テスト用に差し替えた fetch を後片付けする
      delete globalThis.fetch;
    });

    it("renders the app name", async () => {
      render(<App apiBaseUrl={API_BASE_URL} />);
      expect(screen.getByRole("heading", { name: "logue" })).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Google でログイン" })).toBeInTheDocument(),
      );
    });
  });

  describe("authenticated", () => {
    const user = { id: "u1", email: "taro@example.com", name: "Taro", pictureUrl: null };

    beforeEach(() => {
      const server = createMockApiServer(API_BASE_URL);
      globalThis.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.endsWith("/api/auth/me")) {
          return Promise.resolve({ ok: true, json: async () => user });
        }
        return server.fetchMock(input, init);
      }) as unknown as typeof fetch;
    });

    afterEach(() => {
      // @ts-expect-error テスト用に差し替えた fetch を後片付けする
      delete globalThis.fetch;
    });

    it("switches between the entry/list/metrics tabs", async () => {
      render(<App apiBaseUrl={API_BASE_URL} />);
      await waitFor(() => expect(screen.getByText(/Taro でログイン中/)).toBeInTheDocument());

      await waitFor(() => expect(screen.getByText(/記録項目がまだありません/)).toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: "記録項目管理" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "記録項目グループ" })).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole("button", { name: "記録一覧" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "記録一覧" })).toBeInTheDocument(),
      );
    });
  });
});
