import { createMetricsClient } from "../metrics";

const METRIC = {
  id: "m1",
  groupId: null,
  name: "体重",
  valueType: "number" as const,
  unit: "kg",
  sortOrder: 0,
  isArchived: false,
  choiceOptions: [],
};

describe("metrics client", () => {
  it("lists metrics and includes includeArchived in the query string", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([METRIC]), { status: 200 }));
    const client = createMetricsClient({ baseUrl: "http://api.test", fetch: fetchMock });

    const metrics = await client.list({ includeArchived: true });

    expect(metrics).toEqual([METRIC]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/metrics?includeArchived=true",
      expect.anything(),
    );
  });

  it("throws when the response does not match the schema", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([{ id: "m1" }]), { status: 200 }));
    const client = createMetricsClient({ baseUrl: "http://api.test", fetch: fetchMock });

    await expect(client.list()).rejects.toThrow();
  });
});
