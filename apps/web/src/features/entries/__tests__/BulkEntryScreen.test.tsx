import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { BulkEntryScreen } from "../BulkEntryScreen";

const API_BASE_URL = "http://localhost:8787";

describe("BulkEntryScreen", () => {
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
    render(<BulkEntryScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByText(/記録項目がまだありません/)).toBeInTheDocument());
  });

  it("auto-selects the first metric and lists one row per day in the range, pre-filled from existing entries", async () => {
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
    server.entries.push({ id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-02" });

    render(<BulkEntryScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("一括入力する記録項目")).toHaveValue("m1"));

    fireEvent.change(screen.getByLabelText("一括入力の開始日"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("一括入力の終了日"), {
      target: { value: "2026-07-03" },
    });

    await waitFor(() => expect(screen.getByLabelText("2026-07-02 の記録")).toHaveValue(70));
    expect(screen.getByLabelText("2026-07-01 の記録")).toHaveValue(null);
    expect(screen.getByLabelText("2026-07-03 の記録")).toHaveValue(null);
  });

  it("submits values for multiple days at once, upserting existing entries and creating new ones", async () => {
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
    server.entries.push({ id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" });

    render(<BulkEntryScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("一括入力する記録項目")).toHaveValue("m1"));
    fireEvent.change(screen.getByLabelText("一括入力の開始日"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("一括入力の終了日"), {
      target: { value: "2026-07-02" },
    });
    await waitFor(() => expect(screen.getByLabelText("2026-07-01 の記録")).toHaveValue(70));

    fireEvent.change(screen.getByLabelText("2026-07-01 の記録"), { target: { value: "71.5" } });
    fireEvent.change(screen.getByLabelText("2026-07-02 の記録"), { target: { value: "72" } });
    fireEvent.click(screen.getByRole("button", { name: "まとめて記録する" }));

    await waitFor(() => expect(screen.getByText("2件を記録しました")).toBeInTheDocument());
    expect(server.entries).toHaveLength(2);
    expect(server.entries.find((e) => e.recordedAt === "2026-07-01")).toMatchObject({
      id: "e1",
      value: "71.5",
    });
    expect(server.entries.find((e) => e.recordedAt === "2026-07-02")).toMatchObject({
      value: "72",
    });
  });

  it("deletes an existing entry when its row is cleared and submitted", async () => {
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
    server.entries.push({ id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" });

    render(<BulkEntryScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("一括入力する記録項目")).toHaveValue("m1"));
    fireEvent.change(screen.getByLabelText("一括入力の開始日"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("一括入力の終了日"), {
      target: { value: "2026-07-01" },
    });
    await waitFor(() => expect(screen.getByLabelText("2026-07-01 の記録")).toHaveValue(70));

    fireEvent.change(screen.getByLabelText("2026-07-01 の記録"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "まとめて記録する" }));

    await waitFor(() => expect(server.entries).toHaveLength(0));
  });

  it("shows an error and disables submit when the start date is after the end date", async () => {
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

    render(<BulkEntryScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("一括入力する記録項目")).toHaveValue("m1"));
    fireEvent.change(screen.getByLabelText("一括入力の開始日"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("一括入力の終了日"), {
      target: { value: "2026-07-01" },
    });

    expect(screen.getByText("開始日は終了日より前の日付にしてください。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "まとめて記録する" })).toBeDisabled();
  });

  it("switches the pre-filled values when a different metric is selected", async () => {
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
        name: "腹筋",
        type: "number",
        unit: "回",
        sortOrder: 1,
        isArchived: false,
        choiceOptions: [],
      },
    );
    server.entries.push(
      { id: "e1", metricId: "m1", value: "70", recordedAt: "2026-07-01" },
      { id: "e2", metricId: "m2", value: "30", recordedAt: "2026-07-01" },
    );

    render(<BulkEntryScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() => expect(screen.getByLabelText("一括入力する記録項目")).toHaveValue("m1"));
    fireEvent.change(screen.getByLabelText("一括入力の開始日"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("一括入力の終了日"), {
      target: { value: "2026-07-01" },
    });
    await waitFor(() => expect(screen.getByLabelText("2026-07-01 の記録")).toHaveValue(70));

    fireEvent.change(screen.getByLabelText("一括入力する記録項目"), { target: { value: "m2" } });
    await waitFor(() => expect(screen.getByLabelText("2026-07-01 の記録")).toHaveValue(30));
  });
});
