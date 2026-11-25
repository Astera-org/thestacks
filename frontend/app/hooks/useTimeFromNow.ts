import { TimeTickContext } from "@/contexts/TimeTickContext";
import { capitalize } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useContext } from "react";

// This is the only place that the relativeTime plugin is used. If `from`,
// `fromNow`, `to`, or `toNow` are needed elsewhere then they will also need
// to extend the relativeTime plugin.
dayjs.extend(relativeTime);

/**
 * A React hook that returns a human-readable string representing the time
 * elapsed since a given date or the time remaining until a future date.
 * The hook automatically updates the displayed time at appropriate intervals
 * to ensure accuracy.
 * @param timestamp The date in the past (or future) in a `dayjs` accepted date
 * @param options Optional settings for the hook
 * @returns A human-readable string representing the time from now
 */
export function useTimeFromNow(
  timestamp: Parameters<typeof dayjs>[0],
  options?: { textCase?: "lower" | "upper" }
) {
  useContext(TimeTickContext);

  if (timestamp == null) {
    return null;
  }

  const output = dayjs(timestamp).fromNow();

  if (options?.textCase === "upper") {
    return output.toLocaleUpperCase();
  }

  if (options?.textCase === "lower") {
    return output.toLocaleLowerCase();
  }

  return capitalize(output);
}
