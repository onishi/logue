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
    server.entries.push(
      { id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "o1", recordedAt: "2026-07-02" },
    );
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("shows entries with the metric unit and choice label applied, newest first", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("体調: 良い");
    expect(items[1]).toHaveTextContent("体重: 70 kg");
  });

  it("filters entries by group", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("グループで絞り込み"), { target: { value: "g1" } });

    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent("体重");
    });
  });

  it("deletes an entry", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));

    fireEvent.click(screen.getAllByRole("button", { name: "削除" })[0]!);

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(server.entries).toHaveLength(1);
  });

  it("edits an entry's value and date", async () => {
    render(<EntryListScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(2));

    fireEvent.click(screen.getAllByRole("button", { name: "編集" })[0]!);
    fireEvent.change(screen.getByLabelText("体調 の値"), { target: { value: "o1" } });
    fireEvent.change(screen.getByLabelText("体調 の日付"), { target: { value: "2026-07-15" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByText(/2026-07-15/)).toBeInTheDocument());
  });
});
