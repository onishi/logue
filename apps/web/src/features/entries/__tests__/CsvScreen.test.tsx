import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createMockApiServer } from "../../../testing/mockApiServer";
import { CsvScreen } from "../CsvScreen";

const API_BASE_URL = "http://localhost:8787";

describe("CsvScreen", () => {
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

  it("downloads a CSV of the export-scoped entries", async () => {
    let capturedBlob: Blob | undefined;
    const createObjectURL = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock";
    });
    const revokeObjectURL = jest.fn();
    // jsdom は URL.createObjectURL/revokeObjectURL を実装していないためスタブする
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    // jsdom は <a download> によるダウンロードを認識せず、click() を素朴なページ遷移として
    // 扱おうとしてしまうため（"Not implemented: navigation" 警告の原因）、click 自体はスタブする
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<CsvScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "CSVでダウンロード" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "CSVでダウンロード" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = capturedBlob!;
    expect(blob.type).toBe("text/csv;charset=utf-8;");
    // jsdom の Blob は text() を実装していないため FileReader で読み出す。
    // readAsText は先頭の UTF-8 BOM をエンコーディング指示として解釈して取り除くため
    // （実ブラウザでも同様の挙動）、読み出し結果には BOM は含まれない。
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    // 数値項目はCSV上では単位を付けない生の値で書き出す（再インポート時に数値として
    // 読み戻せるようにするため）。
    expect(text).toBe(["日付,体重（kg）,体調", "2026-07-02,,良い", "2026-07-01,70,"].join("\r\n"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    // @ts-expect-error テスト用のスタブを後片付けする
    delete URL.createObjectURL;
    // @ts-expect-error テスト用のスタブを後片付けする
    delete URL.revokeObjectURL;
    clickSpy.mockRestore();
  });

  it("shows a message instead of the download button when there is nothing to export", async () => {
    server.entries.length = 0;

    render(<CsvScreen apiBaseUrl={API_BASE_URL} />);

    await waitFor(() =>
      expect(screen.getByText("書き出せる記録がありません。")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "CSVでダウンロード" })).not.toBeInTheDocument();
  });

  it("scopes the exported CSV to the selected group", async () => {
    render(<CsvScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "CSVでダウンロード" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "絞り込み" }));
    fireEvent.change(screen.getByLabelText("グループで絞り込み"), { target: { value: "g1" } });

    URL.createObjectURL = jest.fn(() => "blob:mock");
    URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: "CSVでダウンロード" }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    // @ts-expect-error テスト用のスタブを後片付けする
    delete URL.createObjectURL;
    // @ts-expect-error テスト用のスタブを後片付けする
    delete URL.revokeObjectURL;
    clickSpy.mockRestore();
  });

  it("previews a selected CSV file and imports it after confirmation", async () => {
    render(<CsvScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "CSVでダウンロード" })).toBeInTheDocument(),
    );

    const csv = ["日付,体重（kg）,体調", "2026-07-03,72,良い"].join("\r\n");
    const file = new File([csv], "entries.csv", { type: "text/csv" });
    const input = screen.getByLabelText("CSVから読み込む");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("2件を読み込みます。")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "インポートする" }));

    await waitFor(() => expect(screen.getByText("2件を読み込みました")).toBeInTheDocument());
    expect(server.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricId: "m1", recordedAt: "2026-07-03", value: "72" }),
        expect.objectContaining({ metricId: "m2", recordedAt: "2026-07-03", value: "o1" }),
      ]),
    );
  });

  it("shows import issues and lets the user cancel without importing", async () => {
    render(<CsvScreen apiBaseUrl={API_BASE_URL} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "CSVでダウンロード" })).toBeInTheDocument(),
    );

    const csv = ["日付,体重（kg）", "2026-07-03,abc"].join("\r\n");
    const file = new File([csv], "entries.csv", { type: "text/csv" });
    const input = screen.getByLabelText("CSVから読み込む");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText("2行目「体重（kg）」: 数値「abc」が不正です。")).toBeInTheDocument(),
    );
    expect(screen.getByText("0件を読み込みます。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByText("0件を読み込みます。")).not.toBeInTheDocument();
    expect(server.entries).toHaveLength(2);
  });
});
