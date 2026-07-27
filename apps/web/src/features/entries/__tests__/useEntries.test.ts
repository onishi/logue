import type { ApiClient } from "@logue/shared/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useEntries } from "../useEntries";

function createClientMock(): ApiClient {
  return {
    metricGroups: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
    metrics: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
    entries: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
  } as unknown as ApiClient;
}

describe("useEntries", () => {
  it("sorts entries by recordedAt descending", async () => {
    const client = createClientMock();
    (client.entries.list as jest.Mock).mockResolvedValue([
      {
        id: "e1",
        metricId: "m1",
        valueNumber: 65,
        valueText: null,
        recordedAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "e2",
        metricId: "m1",
        valueNumber: 64,
        valueText: null,
        recordedAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    const { result } = renderHook(() => useEntries(client));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.entries.map((e) => e.id)).toEqual(["e2", "e1"]);
  });

  it("passes filter params through to the client", async () => {
    const client = createClientMock();
    (client.entries.list as jest.Mock).mockResolvedValue([]);

    renderHook(() => useEntries(client, { metricId: "m1", from: "2026-07-01", limit: 10 }));

    await waitFor(() =>
      expect(client.entries.list).toHaveBeenCalledWith({
        metricId: "m1",
        from: "2026-07-01",
        to: undefined,
        limit: 10,
      }),
    );
  });

  it("create() inserts the new entry keeping sort order", async () => {
    const client = createClientMock();
    (client.entries.list as jest.Mock).mockResolvedValue([]);
    (client.entries.create as jest.Mock).mockResolvedValue({
      id: "e1",
      metricId: "m1",
      valueNumber: 65,
      valueText: null,
      recordedAt: "2026-07-01T00:00:00.000Z",
    });

    const { result } = renderHook(() => useEntries(client));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.create({ metricId: "m1", valueNumber: 65 });
    });

    expect(result.current.entries).toHaveLength(1);
  });

  it("remove() drops the entry from state", async () => {
    const client = createClientMock();
    (client.entries.list as jest.Mock).mockResolvedValue([
      {
        id: "e1",
        metricId: "m1",
        valueNumber: 65,
        valueText: null,
        recordedAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    const { result } = renderHook(() => useEntries(client));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.remove("e1");
    });

    expect(result.current.entries).toEqual([]);
  });
});
