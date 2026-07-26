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

  it("prompts for a metric selection before showing data", async () => {
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
    await waitFor(() => expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument());
    expect(screen.getByText("記録項目を1つ以上選択してください。")).toBeInTheDocument();
  });

  it("shows a data table with per-day averages once a metric is selected", async () => {
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
    server.entries.push(
      { id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m1", value: "72", recordedAt: "2026-07-01" },
      { id: "e3", metricId: "m1", value: "71", recordedAt: "2026-07-02" },
    );

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("体重（kg）"));
    fireEvent.click(screen.getByRole("button", { name: "表で見る" }));

    const rows = await screen.findAllByRole("row");
    expect(rows[1]).toHaveTextContent("2026-07-01");
    expect(rows[1]).toHaveTextContent("71"); // (70+72)/2
    expect(rows[2]).toHaveTextContent("2026-07-02");
    expect(rows[2]).toHaveTextContent("71");
  });

  it("applies the moving average window to the table values", async () => {
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
    server.entries.push(
      { id: "e1", metricId: "m1", value: "10", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m1", value: "20", recordedAt: "2026-07-02" },
    );

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("体重（kg）"));
    fireEvent.click(screen.getByRole("button", { name: "表で見る" }));

    fireEvent.change(screen.getByLabelText("移動平均"), { target: { value: "30" } });

    const rows = await screen.findAllByRole("row");
    expect(rows[2]).toHaveTextContent("2026-07-02");
    expect(rows[2]).toHaveTextContent("15"); // (10+20)/2 の30日移動平均
  });

  it("applies a custom moving average window when selected", async () => {
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
    server.entries.push(
      { id: "e1", metricId: "m1", value: "10", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m1", value: "30", recordedAt: "2026-07-02" },
    );

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("体重（kg）"));
    fireEvent.click(screen.getByRole("button", { name: "表で見る" }));

    fireEvent.change(screen.getByLabelText("移動平均"), { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText("移動平均の期間（日）"), { target: { value: "2" } });

    const rows = await screen.findAllByRole("row");
    expect(rows[2]).toHaveTextContent("2026-07-02");
    expect(rows[2]).toHaveTextContent("20"); // (10+30)/2 の2日移動平均
  });

  it("aggregates the table by month when the granularity is changed", async () => {
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
    server.entries.push(
      { id: "e1", metricId: "m1", value: "10", recordedAt: "2026-06-01" },
      { id: "e2", metricId: "m1", value: "20", recordedAt: "2026-07-01" },
    );

    render(<GraphScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("体重（kg）"));
    fireEvent.click(screen.getByRole("button", { name: "表で見る" }));

    fireEvent.change(screen.getByLabelText("表示単位"), { target: { value: "month" } });

    const rows = await screen.findAllByRole("row");
    expect(rows[1]).toHaveTextContent("2026-06");
    expect(rows[2]).toHaveTextContent("2026-07");
  });

  it("renders the chart view without crashing when multiple metrics are selected", async () => {
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
    await waitFor(() => expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("体重（kg）"));
    fireEvent.click(screen.getByLabelText("体脂肪率（%）"));

    await waitFor(() =>
      expect(document.querySelector(".recharts-responsive-container")).toBeInTheDocument(),
    );
  });
});
