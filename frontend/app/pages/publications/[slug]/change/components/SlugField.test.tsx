import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SlugField from "./SlugField";

describe("SlugField", () => {
  it("adopts a slug the server replaced", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SlugField title="My Title" value="taken-slug-pub" onChange={onChange} />
    );

    rerender(
      <SlugField
        title="My Title"
        value="taken-slug-pub-2"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("textbox")).toHaveProperty(
      "value",
      "taken-slug-pub-2"
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not keep re-sending an auto slug the server replaced", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SlugField title="Long Enough Title" value="" onChange={onChange} />
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith("long-enough-title");

    rerender(
      <SlugField
        title="Long Enough Title"
        value="long-enough-title-2"
        onChange={onChange}
      />
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox")).toHaveProperty(
      "value",
      "long-enough-title-2"
    );
    expect(screen.getByRole("button", { name: /reset/i })).toBeDefined();
  });

  it("shows a locked field without the Reset button when disabled", () => {
    render(
      <SlugField
        disabled
        title="My Title"
        value="published-slug"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("textbox")).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
  });
});
