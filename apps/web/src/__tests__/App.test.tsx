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
      window.history.replaceState(null, "", "/");
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
      delete document.documentElement.dataset.theme;
      window.history.replaceState(null, "", "/");
    });

    it("switches between tabs while updating the browser URL", async () => {
      render(<App apiBaseUrl={API_BASE_URL} />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Taro のメニュー" })).toBeInTheDocument(),
      );

      await waitFor(() => expect(screen.getByText(/記録項目がまだありません/)).toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: "項目管理" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "記録項目グループ" })).toBeInTheDocument(),
      );
      expect(window.location.pathname).toBe("/metrics");

      fireEvent.click(screen.getByRole("button", { name: "記録一覧" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "記録一覧" })).toBeInTheDocument(),
      );
      expect(window.location.pathname).toBe("/entries");
    });

    it("opens 記録する pre-filled with a date's data when its 編集 button is clicked from 記録一覧", async () => {
      const server = createMockApiServer(API_BASE_URL);
      server.metrics.push({
        id: "m1",
        metricGroupId: null,
        name: "体重",
        type: "number",
        unit: "kg",
        sortOrder: 0,
        isArchived: false,
        choiceOptions: [],
      });
      server.entries.push({ id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-15" });
      globalThis.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.endsWith("/api/auth/me")) {
          return Promise.resolve({ ok: true, json: async () => user });
        }
        return server.fetchMock(input, init);
      }) as unknown as typeof fetch;

      render(<App apiBaseUrl={API_BASE_URL} />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Taro のメニュー" })).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole("button", { name: "記録一覧" }));
      await waitFor(() => expect(screen.getByText("70 kg")).toBeInTheDocument());

      fireEvent.click(screen.getByRole("button", { name: "2026-07-15を編集" }));

      await waitFor(() => expect(screen.getByLabelText("記録日")).toBeInTheDocument());
      expect(screen.getByLabelText("記録日")).toHaveValue("2026-07-15");
      await waitFor(() => expect(screen.getByLabelText("体重")).toHaveValue(70));
      expect(screen.getByRole("button", { name: "体重 の入力を消す" })).toBeInTheDocument();
      expect(window.location.pathname).toBe("/");
      expect(window.location.search).toBe("?date=2026-07-15");
    });

    it("opens the screen represented by the current URL", async () => {
      window.history.replaceState(null, "", "/graphs");
      render(<App apiBaseUrl={API_BASE_URL} />);

      await waitFor(() =>
        expect(screen.getByText(/数値型の記録項目がまだありません/)).toBeInTheDocument(),
      );
      expect(screen.getByRole("button", { name: "グラフ" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("applies the selected theme to the document root", async () => {
      render(<App apiBaseUrl={API_BASE_URL} />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Taro のメニュー" })).toBeInTheDocument(),
      );
      expect(document.documentElement.dataset.theme).toBeUndefined();

      fireEvent.click(screen.getByRole("button", { name: "Taro のメニュー" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "設定" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole("radio", { name: "ダーク" }));
      await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
      await waitFor(() => expect(screen.getByRole("radio", { name: "ダーク" })).toBeChecked());

      fireEvent.click(screen.getByRole("radio", { name: "端末の設定に合わせる" }));
      await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
    });
  });
});
