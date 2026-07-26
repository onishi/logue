import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SettingsScreen } from "../SettingsScreen";

describe("SettingsScreen", () => {
  it("marks the current theme as checked", () => {
    render(<SettingsScreen theme="dark" onChangeTheme={jest.fn()} />);
    expect(screen.getByRole("radio", { name: "ダーク" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "ライト" })).not.toBeChecked();
  });

  it("calls onChangeTheme when a different option is selected", () => {
    const onChangeTheme = jest.fn();
    render(<SettingsScreen theme="system" onChangeTheme={onChangeTheme} />);

    fireEvent.click(screen.getByRole("radio", { name: "ライト" }));

    expect(onChangeTheme).toHaveBeenCalledWith("light");
  });
});
