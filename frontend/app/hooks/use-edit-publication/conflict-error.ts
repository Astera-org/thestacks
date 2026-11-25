export class ConflictError extends Error {
  constructor(public serverVersion: number) {
    super("Publication was modified elsewhere");
  }
}
