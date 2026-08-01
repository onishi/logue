import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { EntryFormScreen } from "../EntryFormScreen";

const API_BASE_URL = "http://localhost:8787";

describe("EntryFormScreen", () => {
  let server: ReturnType<typeof createMockApiServer>;

  beforeEach(() => {
    server = createMockApiServer(API_BASE_URL);
    globalThis.fetch = server.fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error テスト用に差し替えた fetch を後片付けする
    delete globalThis.fetch;
  });

  it("shows a guidance message when there are no active metrics", async () => {
    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText(/記録項目がまだありません/)).toBeInTheDocument());
  });

  it("does not show archived metrics", async () => {
    server.metrics.push({
      id: "m1",
      metricGroupId: null,
      name: "旧項目",
      type: "text",
      unit: null,
      sortOrder: 0,
      isArchived: true,
      choiceOptions: [],
    });
    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText(/記録項目がまだありません/)).toBeInTheDocument());
  });

  it("submits values grouped by metric group and skips blank inputs", async () => {
    server.groups.push({ id: "g1", name: "体組成", sortOrder: 0 });
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
        metricGroupId: null,
        name: "メモ",
        type: "text",
        unit: null,
        sortOrder: 1,
        isArchived: false,
        choiceOptions: [],
      },
    );

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("記録日"), { target: { value: "2026-07-20" } });
    // 選択した日付の既存記録を読み込み終わるまで入力欄は disabled になるため待機する
    await waitFor(() => expect(screen.getByLabelText("体重")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("体重"), { target: { value: "70.5" } });
    // メモは空欄のまま送信する

    fireEvent.click(screen.getByRole("button", { name: "記録する" }));

    await waitFor(() => expect(screen.getByText("記録しました")).toBeInTheDocument());
    expect(server.entries).toEqual([
      expect.objectContaining({ metricId: "m1", value: "70.5", recordedAt: "2026-07-20" }),
    ]);
  });

  it("renders a select input for choice metrics using option ids as values", async () => {
    server.metrics.push({
      id: "m1",
      metricGroupId: null,
      name: "体調",
      type: "choice",
      unit: null,
      sortOrder: 0,
      isArchived: false,
      choiceOptions: [
        { id: "o1", label: "良い", sortOrder: 0 },
        { id: "o2", label: "悪い", sortOrder: 1 },
      ],
    });

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体調")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("体調"), { target: { value: "o2" } });
    fireEvent.click(screen.getByRole("button", { name: "記録する" }));

    await waitFor(() => expect(server.entries).toHaveLength(1));
    expect(server.entries[0]).toMatchObject({ metricId: "m1", value: "o2" });
  });

  it("pre-fills an existing entry for the selected date and updates it instead of duplicating", async () => {
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
    server.entries.push({ id: "e1", metricId: "m1", value: "70.0", recordedAt: "2026-07-15" });

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("記録日"), { target: { value: "2026-07-15" } });
    await waitFor(() => expect(screen.getByLabelText("体重")).toHaveValue(70));

    fireEvent.change(screen.getByLabelText("体重"), { target: { value: "71.5" } });
    fireEvent.click(screen.getByRole("button", { name: "記録する" }));

    await waitFor(() => expect(screen.getByText("記録しました")).toBeInTheDocument());
    expect(server.entries).toHaveLength(1);
    expect(server.entries[0]).toMatchObject({ id: "e1", value: "71.5", recordedAt: "2026-07-15" });
  });

  it("clears the field's text via the small clear button without touching the server", async () => {
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
    server.entries.push({ id: "e1", metricId: "m1", value: "70.0", recordedAt: "2026-07-15" });

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} initialDate="2026-07-15" />);
    await waitFor(() => expect(screen.getByLabelText("体重")).toHaveValue(70));

    fireEvent.click(screen.getByRole("button", { name: "体重 の入力を消す" }));

    expect(screen.getByLabelText("体重")).toHaveValue(null);
    expect(server.entries).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "体重 の入力を消す" })).not.toBeInTheDocument();
  });

  it("deletes the existing entry when its field is cleared and the form is submitted", async () => {
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
    server.entries.push({ id: "e1", metricId: "m1", value: "70.0", recordedAt: "2026-07-15" });

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} initialDate="2026-07-15" />);
    await waitFor(() => expect(screen.getByLabelText("体重")).toHaveValue(70));

    fireEvent.click(screen.getByRole("button", { name: "体重 の入力を消す" }));
    fireEvent.click(screen.getByRole("button", { name: "記録する" }));

    await waitFor(() => expect(screen.getByText("記録しました")).toBeInTheDocument());
    expect(server.entries).toHaveLength(0);
  });

  it("moves to the previous/next day via the date pager buttons", async () => {
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

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} initialDate="2026-07-15" />);
    await waitFor(() => expect(screen.getByLabelText("記録日")).toHaveValue("2026-07-15"));

    fireEvent.click(screen.getByRole("button", { name: "前の日" }));
    await waitFor(() => expect(screen.getByLabelText("記録日")).toHaveValue("2026-07-14"));

    fireEvent.click(screen.getByRole("button", { name: "次の日" }));
    await waitFor(() => expect(screen.getByLabelText("記録日")).toHaveValue("2026-07-15"));

    fireEvent.click(screen.getByRole("button", { name: "次の日" }));
    await waitFor(() => expect(screen.getByLabelText("記録日")).toHaveValue("2026-07-16"));
  });

  it("disables the inputs while loading the selected date's existing entries", async () => {
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

    render(<EntryFormScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("体重")).toBeEnabled());

    fireEvent.change(screen.getByLabelText("記録日"), { target: { value: "2026-07-15" } });
    expect(screen.getByLabelText("体重")).toBeDisabled();

    await waitFor(() => expect(screen.getByLabelText("体重")).toBeEnabled());
  });
});
