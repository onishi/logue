import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { GraphScreen } from "../GraphScreen";

const API_BASE_URL = "http://localhost:8787";

// jsdom は ResizeObserver を実装していないため、recharts の ResponsiveContainer 用にスタブする
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("GraphScreen", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverStub;
  });

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("shows a loading message instead of the no-metrics guidance while metrics are still loading", async () => {
    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    expect(screen.queryByText(/数値型の記録項目がまだありません/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/数値型の記録項目がまだありません/)).toBeInTheDocument(),
    );
  });

  it("shows a guidance message when there are no number metrics", async () => {
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

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByText(/数値型の記録項目がまだありません/)).toBeInTheDocument(),
    );
  });

  it("does not offer archived number metrics", async () => {
    server.metrics.push({
      id: "m1",
      metricGroupId: null,
      name: "旧体重",
      type: "number",
      unit: "kg",
      sortOrder: 0,
      isArchived: true,
      choiceOptions: [],
    });

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByText(/数値型の記録項目がまだありません/)).toBeInTheDocument(),
    );
  });

  it("shows a chart for each number metric by default, without any selection step", async () => {
    server.metrics.push(
      {
        id: "m1",
        metricGroupId: null,
        name: "体重",
        type: "number",
        unit: "kg",
        sortOrder: 0,
        isArchived: false,
        choiceOptions: [],
      },
      {
        id: "m2",
        metricGroupId: null,
        name: "体脂肪率",
        type: "number",
        unit: "%",
        sortOrder: 1,
        isArchived: false,
        choiceOptions: [],
      },
    );
    server.entries.push(
      { id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "20", recordedAt: "2026-07-01" },
    );

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(document.querySelectorAll(".recharts-responsive-container")).toHaveLength(2),
    );
    expect(screen.getByRole("heading", { name: "体重（kg）" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "体脂肪率（%）" })).toBeInTheDocument();
  });

  it("shows a guidance message per metric when it has no entries yet", async () => {
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

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "体重（kg）" })).toBeInTheDocument(),
    );
    expect(screen.getByText("記録がありません。")).toBeInTheDocument();
  });

  it("shows the granularity and moving-average controls in one row, always visible without any toggle", async () => {
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

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "体重（kg）" })).toBeInTheDocument(),
    );

    expect(screen.getByLabelText("表示単位")).toBeInTheDocument();
    expect(screen.getByLabelText("移動平均")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "表示設定" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /表で見る|グラフで見る/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("表示単位").closest(".control-group-row")).toContainElement(
      screen.getByLabelText("移動平均"),
    );
  });

  it("reveals the custom period input only once the カスタム moving-average preset is selected", async () => {
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

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "体重（kg）" })).toBeInTheDocument(),
    );

    expect(screen.queryByLabelText("移動平均の期間（日）")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("移動平均"), { target: { value: "-1" } });
    expect(screen.getByLabelText("移動平均の期間（日）")).toBeInTheDocument();
  });
});
