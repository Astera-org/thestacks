/** @deprecated */
export const ROLE_DEFS = [
  {
    v: "Owner",
    d: "Full control. Can transfer ownership, change permissions, delete the pub.",
  },
  { v: "Admin", d: "Manage access and all content. Cannot delete the pub." },
  { v: "Editor", d: "Edit the pub content, metadata, and attached files." },
  { v: "Reviewer", d: "Read and comment. Cannot edit content." },
  {
    v: "Viewer",
    d: "Read-only access. Useful for sharing pre-release drafts.",
  },
];
