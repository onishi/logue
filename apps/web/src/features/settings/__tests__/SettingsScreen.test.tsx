import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { SettingsScreen } from "../SettingsScreen";

const API_BASE_URL = "http://localhost:8787";

describe("SettingsScreen", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("marks the current theme as checked", async () => {
    render(<SettingsScreen apiBaseUrl={API_BASE_URL} theme="dark" onChangeTheme={jest.fn()} />);
    expect(screen.getByRole("radio", { name: "ダーク" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "ライト" })).not.toBeChecked();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Googleスプレッドシートと連携する" }),
      ).toBeInTheDocument(),
    );
  });

  it("calls onChangeTheme when a different option is selected", () => {
    const onChangeTheme = jest.fn();
    render(
      <SettingsScreen apiBaseUrl={API_BASE_URL} theme="system" onChangeTheme={onChangeTheme} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "ライト" }));

    expect(onChangeTheme).toHaveBeenCalledWith("light");
  });

  it("shows a connect link when not connected to a spreadsheet", async () => {
    render(<SettingsScreen apiBaseUrl={API_BASE_URL} theme="system" onChangeTheme={jest.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Googleスプレッドシートと連携する" }),
      ).toBeInTheDocument(),
    );
    const link = screen
      .getByRole("button", { name: "Googleスプレッドシートと連携する" })
      .closest("a");
    expect(link).toHaveAttribute("href", `${API_BASE_URL}/api/sheets/connect`);
  });

  it("lets a connected user configure the spreadsheet, sync now, and disconnect", async () => {
    server.sheetsConnection.connected = true;
    server.sheetsConnection.spreadsheetId = "existing-id";
    server.sheetsConnection.sheetName = "logue";

    render(<SettingsScreen apiBaseUrl={API_BASE_URL} theme="system" onChangeTheme={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByLabelText("スプレッドシートのURLまたはID")).toHaveValue("existing-id"),
    );

    fireEvent.change(screen.getByLabelText("スプレッドシートのURLまたはID"), {
      target: { value: "new-id" },
    });
    fireEvent.click(screen.getByRole("button", { name: "設定を保存" }));
    await waitFor(() => expect(screen.getByText("設定を保存しました")).toBeInTheDocument());
    expect(server.sheetsConnection.spreadsheetId).toBe("new-id");

    fireEvent.click(screen.getByRole("button", { name: "今すぐ同期" }));
    await waitFor(() => expect(screen.getByText("同期しました")).toBeInTheDocument());

    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "連携を解除" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Googleスプレッドシートと連携する" }),
      ).toBeInTheDocument(),
    );
    expect(server.sheetsConnection.connected).toBe(false);
    confirmSpy.mockRestore();
  });
});
