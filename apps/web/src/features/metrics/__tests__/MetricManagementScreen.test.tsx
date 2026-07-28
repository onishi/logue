import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { MetricManagementScreen } from "../MetricManagementScreen";

const API_BASE_URL = "http://localhost:8787";

describe("MetricManagementScreen", () => {
  let server: ReturnType<typeof createMockApiServer>;
  let confirmSpy: jest.SpiedFunction<typeof window.confirm>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
    confirmSpy.mockRestore();
  });

  it("adds a group and a number metric assigned to it", async () => {
    render(<MetricManagementScreen apiBaseUrl={API_BASE_URL} />);

    fireEvent.change(screen.getByLabelText("新しいグループ名"), { target: { value: "体組成" } });
    fireEvent.click(screen.getByRole("button", { name: "グループを追加" }));
    await waitFor(() =>
      expect(screen.getByText("体組成", { selector: "span" })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("新しい記録項目の名前"), { target: { value: "体重" } });
    fireEvent.change(screen.getByLabelText("新しい記録項目の単位"), { target: { value: "kg" } });
    fireEvent.change(screen.getByLabelText("新しい記録項目のグループ"), {
      target: { value: server.groups[0]!.id },
    });
    fireEvent.click(screen.getByRole("button", { name: "記録項目を追加" }));

    await waitFor(() => expect(screen.getByText("体重")).toBeInTheDocument());
    expect(screen.getByText("体重").closest("li")).toHaveTextContent("体組成");
    expect(server.metrics).toHaveLength(1);
    expect(server.metrics[0]).toMatchObject({ name: "体重", unit: "kg", type: "number" });
  });

  it("adds a choice metric with choice options", async () => {
    render(<MetricManagementScreen apiBaseUrl={API_BASE_URL} />);

    fireEvent.change(screen.getByLabelText("新しい記録項目の名前"), { target: { value: "体調" } });
    fireEvent.change(screen.getByLabelText("新しい記録項目の種別"), {
      target: { value: "choice" },
    });
    fireEvent.change(screen.getByLabelText("選択肢 1"), { target: { value: "良い" } });
    fireEvent.change(screen.getByLabelText("選択肢 2"), { target: { value: "悪い" } });
    fireEvent.click(screen.getByRole("button", { name: "記録項目を追加" }));

    await waitFor(() => expect(screen.getByText(/体調/)).toBeInTheDocument());
    expect(server.metrics[0]?.choiceOptions.map((o) => o.label)).toEqual(["良い", "悪い"]);
  });

  it("archives, edits and deletes a metric", async () => {
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
    render(<MetricManagementScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText(/体重/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "体重 をアーカイブする" }));
    await waitFor(() => expect(screen.getByText(/アーカイブ済み/)).toBeInTheDocument());
    expect(server.metrics[0]?.isArchived).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "体重 を編集" }));
    fireEvent.change(screen.getByLabelText("体重 の新しい名前"), { target: { value: "体重(朝)" } });
    fireEvent.click(screen.getByRole("button", { name: "体重 の変更を保存" }));
    await waitFor(() => expect(screen.getByText(/体重\(朝\)/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "体重(朝) を削除" }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/体重/)).not.toBeInTheDocument());
    expect(server.metrics).toHaveLength(0);
  });

  it("reorders groups with the up/down buttons", async () => {
    server.groups.push(
      { id: "g1", name: "体組成", sortOrder: 0 },
      { id: "g2", name: "食事", sortOrder: 1 },
    );
    render(<MetricManagementScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText("食事", { selector: "span" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "食事 を上に移動" }));

    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      const groupItems = items.filter((li) => within(li).queryByText(/体組成|食事/));
      expect(groupItems[0]).toHaveTextContent("食事");
    });
  });

  it("saves choice options separately from the general fields", async () => {
    server.metrics.push({
      id: "m1",
      metricGroupId: null,
      name: "体調",
      type: "choice",
      unit: null,
      sortOrder: 0,
      isArchived: false,
      choiceOptions: [{ id: "o1", label: "良い", sortOrder: 0 }],
    });
    render(<MetricManagementScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText(/体調/)).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "体調 を編集" }));
    });
    fireEvent.change(screen.getByLabelText("選択肢 1"), { target: { value: "絶好調" } });
    fireEvent.click(screen.getByRole("button", { name: "体調 の選択肢を保存" }));

    await waitFor(() =>
      expect(server.metrics[0]?.choiceOptions.map((o) => o.label)).toEqual(["絶好調"]),
    );
  });
});
