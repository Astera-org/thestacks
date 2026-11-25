/** Whether a node's space-separated `class` (e.g. `:class: dropdown`) has `name`. */
export function hasClass(node: Record<string, unknown>, name: string): boolean {
  return String(node.class ?? "")
    .split(/\s+/)
    .includes(name);
}
