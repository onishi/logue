import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EntryValueInput } from "../EntryValueInput";

const NUMBER_METRIC = {
  id: "m1",
  groupId: null,
  name: "体重",
  valueType: "number" as const,
  unit: "kg",
  sortOrder: 0,
  isArchived: false,
  choiceOptions: [],
};

const CHOICE_METRIC = {
  id: "m2",
  groupId: null,
  name: "気分",
  valueType: "choice" as const,
  unit: null,
  sortOrder: 0,
  isArchived: false,
  choiceOptions: [
    { id: "c1", label: "良い", sortOrder: 0 },
    { id: "c2", label: "普通", sortOrder: 1 },
  ],
};

const TEXT_METRIC = {
  id: "m3",
  groupId: null,
  name: "メモ",
  valueType: "text" as const,
  unit: null,
  sortOrder: 0,
  isArchived: false,
  choiceOptions: [],
};

describe("EntryValueInput", () => {
  it("renders a number input and reports numeric changes", () => {
    const onChange = jest.fn();
    render(<EntryValueInput metric={NUMBER_METRIC} value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("体重"), { target: { value: "65.5" } });
    expect(onChange).toHaveBeenCalledWith({ valueNumber: 65.5 });
  });

  it("renders choice options as a select", () => {
    const onChange = jest.fn();
    render(<EntryValueInput metric={CHOICE_METRIC} value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("気分"), { target: { value: "普通" } });
    expect(onChange).toHaveBeenCalledWith({ valueText: "普通" });
    expect(screen.getByRole("option", { name: "良い" })).toBeInTheDocument();
  });

  it("renders a text input for free text metrics", () => {
    const onChange = jest.fn();
    render(<EntryValueInput metric={TEXT_METRIC} value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("メモ"), { target: { value: "よく眠れた" } });
    expect(onChange).toHaveBeenCalledWith({ valueText: "よく眠れた" });
  });
});
