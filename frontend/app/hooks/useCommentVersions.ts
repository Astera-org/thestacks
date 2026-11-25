import { VersionInfo } from "@/types";
import { createContext, useContext } from "react";

interface CommentVersionContextValue {
  currentVersionId: number | null;
  versionMap: Map<number, number>;
}

const defaultValue: CommentVersionContextValue = {
  currentVersionId: null,
  versionMap: new Map()
};

export const CommentVersionContext =
  createContext<CommentVersionContextValue>(defaultValue);

export function useCommentVersions() {
  return useContext(CommentVersionContext);
}

/**
 * Map `version_id` to `version_number`.
 *
 * @param versions - The versions to map.
 * @returns A map from `version_id` to `version_number`,
 * or an empty map if no versions are provided.
 */
export function buildVersionMap(
  versions: VersionInfo[] | undefined
): Map<number, number> {
  const map = new Map<number, number>();
  if (!versions) return map;
  for (const v of versions) {
    if (v.version_number != null) {
      map.set(v.id, v.version_number);
    }
  }
  return map;
}

/**
 * Return the version ID with the highest `version_number`.
 *
 * @param versions - The versions to search.
 * @returns The version ID with the highest `version_number`, or `null` if no
 * versions are provided.
 */
export function getLatestVersionId(
  versions: VersionInfo[] | undefined
): number | null {
  if (!versions || versions.length === 0) return null;
  let latest: VersionInfo | null = null;
  for (const v of versions) {
    if (
      v.version_number != null &&
      (latest == null ||
        latest.version_number == null ||
        v.version_number > latest.version_number)
    ) {
      latest = v;
    }
  }
  return latest?.id ?? null;
}
