import { CONTRIBUTOR_ROLES } from "@/lib/constants";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RolesField, { LAST_ROLE_MESSAGE } from "./RolesField";

function renderRoles(
  roles: string[],
  props: { requireRole?: boolean; locked?: boolean } = {}
) {
  const onChange = vi.fn();
  render(
    <RolesField
      contributorName="Ada Lovelace"
      locked={props.locked}
      requireRole={props.requireRole}
      roles={roles}
      onChange={onChange}
    />
  );
  return onChange;
}

function openPicker() {
  fireEvent.click(
    screen.getByRole("button", { name: "Add CRediT role for Ada Lovelace" })
  );
}

describe("RolesField", () => {
  it("lists roles alphabetically as tokens", () => {
    renderRoles(["Writing", "Conceptualization"]);

    const group = screen.getByRole("group", {
      name: "CRediT roles for Ada Lovelace",
    });
    expect(group.textContent?.indexOf("Conceptualization")).toBeLessThan(
      group.textContent?.indexOf("Writing") ?? 0
    );
  });

  it("shows every CRediT role with the selected ones ticked and a count", () => {
    renderRoles(["Software"]);
    openPicker();

    expect(screen.getByText(`1/${CONTRIBUTOR_ROLES.length}`)).toBeDefined();
    for (const role of CONTRIBUTOR_ROLES) {
      const checkbox = screen.getByRole("checkbox", { name: role });
      expect((checkbox as HTMLInputElement).checked).toBe(role === "Software");
    }
  });

  it("adds and removes roles from the picker", () => {
    const onChange = renderRoles(["Software", "Writing"]);
    openPicker();

    fireEvent.click(screen.getByRole("checkbox", { name: "Methodology" }));
    expect(onChange).toHaveBeenLastCalledWith([
      "Software",
      "Writing",
      "Methodology",
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Writing" }));
    expect(onChange).toHaveBeenLastCalledWith(["Software"]);
  });

  it("filters the role list", () => {
    renderRoles([]);
    openPicker();

    fireEvent.change(screen.getByRole("textbox", { name: "Filter roles" }), {
      target: { value: "vis" },
    });
    expect(
      screen.getByRole("checkbox", { name: "Visualization" })
    ).toBeDefined();
    expect(screen.getByRole("checkbox", { name: "Supervision" })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: "Software" })).toBeNull();
  });

  it("keeps the last role when a role is required", () => {
    const onChange = renderRoles(["Supervision"], { requireRole: true });

    expect(
      screen.queryByRole("button", { name: "Remove role: Supervision" })
    ).toBeNull();
    expect(screen.getByTitle(LAST_ROLE_MESSAGE)).toBeDefined();

    openPicker();
    const checkbox = screen.getByRole("checkbox", { name: "Supervision" });
    expect((checkbox as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a role from its token", () => {
    const onChange = renderRoles(["Software", "Writing"], {
      requireRole: true,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove role: Writing" })
    );
    expect(onChange).toHaveBeenCalledWith(["Software"]);
  });

  it("shows a placeholder when empty", () => {
    renderRoles([]);
    expect(screen.getByText("Select roles…")).toBeDefined();
  });

  it("has no controls when locked", () => {
    renderRoles(["Software"], { locked: true });
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("RolesField onOpenChange", () => {
  it("reports when the picker opens and closes", () => {
    const onOpenChange = vi.fn();
    render(
      <RolesField
        contributorName="Ada"
        roles={[]}
        onChange={() => {}}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add CRediT role for Ada" })
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
