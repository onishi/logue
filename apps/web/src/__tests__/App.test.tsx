import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

describe("App", () => {
  it("renders the app name", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "logue" })).toBeInTheDocument();
  });
});
