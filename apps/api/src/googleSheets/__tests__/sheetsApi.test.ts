import { clearAndWriteValues, getValues, quoteSheetName } from "../sheetsApi";

describe("quoteSheetName", () => {
  it("wraps the sheet name in single quotes", () => {
    expect(quoteSheetName("logue")).toBe("'logue'");
  });

  it("escapes embedded single quotes by doubling them", () => {
    expect(quoteSheetName("O'Brien")).toBe("'O''Brien'");
  });
});

describe("getValues", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the values array from the API response", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          values: [
            ["日付", "体重（kg）"],
            ["2026-07-01", "70"],
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const values = await getValues("access-token", "sheet-id", "logue");

    expect(values).toEqual([
      ["日付", "体重（kg）"],
      ["2026-07-01", "70"],
    ]);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toContain("sheet-id/values/");
    expect(decodeURIComponent(url as string)).toContain("'logue'");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer access-token");
  });

  it("returns an empty array when the sheet has no values", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    expect(await getValues("access-token", "sheet-id", "logue")).toEqual([]);
  });

  it("throws when the API responds with an error", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(getValues("access-token", "sheet-id", "logue")).rejects.toThrow(
      "Google Sheets API の値取得に失敗しました",
    );
  });
});

describe("clearAndWriteValues", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("clears the whole sheet before writing starting at A1", async () => {
    const calls: { url: string; method?: string }[] = [];
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      calls.push({ url: input.toString(), method: init?.method });
      return new Response("{}", { status: 200 });
    });

    await clearAndWriteValues("access-token", "sheet-id", "logue", [
      ["日付", "体重（kg）"],
      ["2026-07-01", "70"],
    ]);

    expect(calls).toHaveLength(2);
    expect(calls[0]!.method).toBe("POST");
    expect(decodeURIComponent(calls[0]!.url)).toContain(":clear");
    expect(calls[1]!.method).toBe("PUT");
    expect(decodeURIComponent(calls[1]!.url)).toContain("'logue'!A1");
  });

  it("only clears (skips the write call) when there are no values", async () => {
    const calls: string[] = [];
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      calls.push(input.toString());
      return new Response("{}", { status: 200 });
    });

    await clearAndWriteValues("access-token", "sheet-id", "logue", []);

    expect(calls).toHaveLength(1);
  });

  it("throws when the clear request fails", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("forbidden", { status: 403 }));

    await expect(clearAndWriteValues("access-token", "sheet-id", "logue", [["a"]])).rejects.toThrow(
      "Google Sheets API のクリアに失敗しました",
    );
  });
});
