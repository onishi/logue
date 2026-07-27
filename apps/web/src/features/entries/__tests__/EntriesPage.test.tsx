import type { ApiClient } from "@logue/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EntriesPage } from "../EntriesPage";

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

function createClientMock(): ApiClient {
  return {
    metricGroups: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
    metrics: {
      list: jest.fn().mockResolvedValue([METRIC]),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    entries: {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: "e1",
        metricId: "m1",
        valueNumber: 65,
        valueText: null,
        recordedAt: "2026-07-25T00:00:00.000Z",
      }),
      update: jest.fn(),
      remove: jest.fn(),
    },
  } as unknown as ApiClient;
}

describe("EntriesPage", () => {
  it("records a value for an active metric", async () => {
    const client = createClientMock();
    render(<EntriesPage client={client} />);

    await waitFor(() => expect(screen.getByLabelText("体重")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("体重"), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: "記録する" }));

    await waitFor(() =>
      expect(client.entries.create).toHaveBeenCalledWith(
        expect.objectContaining({ metricId: "m1", valueNumber: 65 }),
      ),
    );
  });

  it("does not submit when no value has been entered", async () => {
    const client = createClientMock();
    render(<EntriesPage client={client} />);

    await waitFor(() => expect(screen.getByLabelText("体重")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "記録する" }));

    expect(client.entries.create).not.toHaveBeenCalled();
  });
});
