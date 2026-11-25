/* ------------------------------------------------------------------ *
 * Lets commit() hand back a promise tied to the batch that ends up
 * carrying that specific edit. This is what replaces useOptimisticAction.
 * ------------------------------------------------------------------ */

export class Deferred<T> {
  readonly promise: Promise<T>;
  resolve!: (value: T) => void;

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve;
    });
    // Callers on the typing path ignore the promise. Mark it handled so a
    // rejection there never surfaces as an unhandled rejection.
    void this.promise.catch(() => {});
  }
}
