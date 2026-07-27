import type { ApiClient } from "@logue/shared/client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMetricGroups } from "../useMetricGroups";

function createClientMock(): ApiClient {
  return {
    metricGroups: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    metrics: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
    entries: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  } as unknown as ApiClient;
}

describe("useMetricGroups", () => {
  it("loads groups sorted by sortOrder on mount", async () => {
    const client = createClientMock();
    (client.metricGroups.list as jest.Mock).mockResolvedValue([
      { id: "b", name: "筋トレ", sortOrder: 1 },
      { id: "a", name: "体組成", sortOrder: 0 },
    ]);

    const { result } = renderHook(() => useMetricGroups(client));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.groups.map((g) => g.id)).toEqual(["a", "b"]);
  });

  it("sets status to error when loading fails", async () => {
    const client = createClientMock();
    (client.metricGroups.list as jest.Mock).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useMetricGroups(client));

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("create() appends the new group and keeps sortOrder", async () => {
    const client = createClientMock();
    (client.metricGroups.list as jest.Mock).mockResolvedValue([]);
    (client.metricGroups.create as jest.Mock).mockResolvedValue({
      id: "a",
      name: "体組成",
      sortOrder: 0,
    });

    const { result } = renderHook(() => useMetricGroups(client));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.create({ name: "体組成" });
    });

    expect(result.current.groups).toEqual([{ id: "a", name: "体組成", sortOrder: 0 }]);
  });

  it("remove() drops the group from state", async () => {
    const client = createClientMock();
    (client.metricGroups.list as jest.Mock).mockResolvedValue([
      { id: "a", name: "体組成", sortOrder: 0 },
    ]);

    const { result } = renderHook(() => useMetricGroups(client));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.remove("a");
    });

    expect(result.current.groups).toEqual([]);
  });
});
