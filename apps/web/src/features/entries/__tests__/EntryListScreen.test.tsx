import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { EntryListScreen } from "../EntryListScreen";

const API_BASE_URL = "http://localhost:8787";

describe("EntryListScreen", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;

    server.groups.push(
      { id: "g1", name: "体組成", sortOrder: 0 },
      { id: "g2", name: "食事", sortOrder: 1 },
    );
    server.metrics.push(
      {
        id: "m1",
        metricGroupId: "g1",
        name: "体重",
        type: "number",
        unit: "kg",
        sortOrder: 0,
        isArchived: false,
        choiceOptions: [],
      },
      {
        id: "m2",
        metricGroupId: "g2",
        name: "体調",
        type: "choice",
        unit: null,
        sortOrder: 1,
        isArchived: false,
        choiceOptions: [{ id: "o1", label: "良い", sortOrder: 0 }],
      },
    );
    // m1 は 07-01 のみ、m2 は 07-02 のみに記録があり、それぞれ他方の日付では空欄になる
    server.entries.push(
      { id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "o1", recordedAt: "2026-07-02" },
    );
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("shows a pivot table with dates as rows and metrics as columns", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);

    await waitFor(() =>
      expect(screen.getByRole("columnheader", { name: /体重/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole("columnheader", { name: /体調/ })).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3); // ヘッダー行 + 2026-07-01 + 2026-07-02

    expect(screen.getByText("70 kg")).toBeInTheDocument();
    expect(screen.getByText("良い")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "体調（2026-07-01）を追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "体重（2026-07-02）を追加" })).toBeInTheDocument();
  });

  it("filters columns by group", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("columnheader", { name: /体重/ })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("グループで絞り込み"), { target: { value: "g1" } });

    await waitFor(() =>
      expect(screen.queryByRole("columnheader", { name: /体調/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("columnheader", { name: /体重/ })).toBeInTheDocument();
  });

  it("fills in a previously empty cell without creating a duplicate entry", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "体重（2026-07-02）を追加" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "体重（2026-07-02）を追加" }));
    fireEvent.change(screen.getByLabelText("体重（2026-07-02）"), { target: { value: "71" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(server.entries).toHaveLength(3));
    expect(
      server.entries.find((e) => e.metricId === "m1" && e.recordedAt === "2026-07-02"),
    ).toMatchObject({ value: "71" });
  });

  it("edits an existing cell's value in place", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText("70 kg")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "体重（2026-07-01）を編集" }));
    fireEvent.change(screen.getByLabelText("体重（2026-07-01）"), { target: { value: "72" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByText("72 kg")).toBeInTheDocument());
    expect(server.entries).toHaveLength(2);
  });

  it("deletes an entry from a cell", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText("70 kg")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "体重（2026-07-01）を削除" }));

    await waitFor(() => expect(server.entries).toHaveLength(1));
  });
});
