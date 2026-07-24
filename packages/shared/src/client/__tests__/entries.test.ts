import { createEntriesClient } from "../entries";

const ENTRY = {
  id: "e1",
  metricId: "m1",
  valueNumber: 65.5,
  valueText: null,
  recordedAt: "2026-07-01T00:00:00.000Z",
};

describe("entries client", () => {
  it("builds a query string from list params", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([ENTRY]), { status: 200 }));
    const client = createEntriesClient({ baseUrl: "http://api.test", fetch: fetchMock });

    await client.list({ metricId: "m1", from: "2026-07-01", limit: 10 });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("metricId=m1");
    expect(url).toContain("from=2026-07-01");
    expect(url).toContain("limit=10");
  });

  it("creates an entry", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(ENTRY), { status: 201 }));
    const client = createEntriesClient({ baseUrl: "http://api.test", fetch: fetchMock });

    const created = await client.create({ metricId: "m1", valueNumber: 65.5 });

    expect(created).toEqual(ENTRY);
  });
});
