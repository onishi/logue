import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

describe("App", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("renders the app name", async () => {
    render(<App apiBaseUrl="http://localhost:8787" />);
    expect(screen.getByRole("heading", { name: "logue" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Google でログイン" })).toBeInTheDocument(),
    );
  });
});
