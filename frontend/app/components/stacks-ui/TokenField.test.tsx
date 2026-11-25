import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TokenField, { Token, TokenAddButton } from "./TokenField";

describe("TokenField", () => {
  it("renders a removable token that calls onRemove", () => {
    const onRemove = vi.fn();
    render(
      <TokenField>
        <Token removeLabel="Remove UCSF" onRemove={onRemove}>
          UCSF
        </Token>
      </TokenField>
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove UCSF" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("hides the remove button on locked tokens", () => {
    render(
      <Token locked removeLabel="Remove UCSF" onRemove={vi.fn()}>
        UCSF
      </Token>
    );

    expect(screen.getByText("UCSF")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the suffix outside the truncated label", () => {
    render(<Token suffix={<span>Default</span>}>UCSF</Token>);

    expect(screen.getByText("UCSF").classList).toContain("truncate");
    expect(screen.getByText("Default").closest(".truncate")).toBeNull();
  });

  it("renders an add button with its accessible name", () => {
    render(<TokenAddButton aria-label="Add role" />);
    expect(screen.getByRole("button", { name: "Add role" })).toBeDefined();
  });
});
