import { createMetricGroupsClient } from "../metricGroups";
import { ApiError } from "../apiError";

const GROUP = { id: "g1", name: "体組成", sortOrder: 0 };

describe("metricGroups client", () => {
  it("lists metric groups", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([GROUP]), { status: 200 }));
    const client = createMetricGroupsClient({ baseUrl: "http://api.test", fetch: fetchMock });

    const groups = await client.list();

    expect(groups).toEqual([GROUP]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/metric-groups",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("creates a metric group", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(GROUP), { status: 201 }));
    const client = createMetricGroupsClient({ baseUrl: "http://api.test", fetch: fetchMock });

    const created = await client.create({ name: "体組成" });

    expect(created).toEqual(GROUP);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/metric-groups",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "体組成" }) }),
    );
  });

  it("throws ApiError with status and body on failure", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_request" }), { status: 400 }),
      );
    const client = createMetricGroupsClient({ baseUrl: "http://api.test", fetch: fetchMock });

    await expect(client.create({ name: "" })).rejects.toMatchObject({
      status: 400,
      body: { error: "invalid_request" },
    });
    await expect(client.create({ name: "" })).rejects.toBeInstanceOf(ApiError);
  });

  it("treats a 204 response as void on remove", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createMetricGroupsClient({ baseUrl: "http://api.test", fetch: fetchMock });

    await expect(client.remove("g1")).resolves.toBeUndefined();
  });
});
