/**
 * The MyST AST version this renderer understands, as `myst-migrate` counts
 * it. It is a literal rather than `MIGRATIONS.length`, so a `myst-*` upgrade
 * that adds a migration fails `versions.test.ts` until it is bumped on
 * purpose, after checking that `myst-to-react` renders the new shapes.
 */
export const MYST_AST_VERSION = 3;

/** The version of Raven's payload wrapper and conventions we understand. */
export const MDAST_SCHEMA_VERSION = 1;

/**
 * Brings a payload to `MYST_AST_VERSION`. Stacks names its version when it
 * asks for the AST, so Raven only sends an older one when it has not caught
 * up; `myst-migrate` is loaded only then.
 */
export async function toRenderableVersion<
  T extends { version: number; tree: unknown }
>(payload: T): Promise<T> {
  if (payload.version > MYST_AST_VERSION) {
    console.warn(
      `MyST AST version ${payload.version} is newer than ${MYST_AST_VERSION}; rendering it anyway.`
    );
  }
  if (payload.version >= MYST_AST_VERSION) return payload;

  const { migrate } = await import("myst-migrate");
  const migrated = await migrate(
    { version: payload.version, mdast: structuredClone(payload.tree) },
    { to: MYST_AST_VERSION }
  );
  return { ...payload, version: migrated.version, tree: migrated.mdast };
}
