import { useTimeFromNow } from "@/hooks/useTimeFromNow";
import { Dayjs } from "dayjs";

/**
 * Time from now (time ago or time in the future) component
 *
 * This component is a wrapper around the `useTimeFromNow` hook, which provides a
 * human-readable string representing the time elapsed since a given date or the
 * time remaining until a future date. It automatically updates the displayed time
 * at appropriate intervals to ensure accuracy.
 * @param param0 The component props
 * @returns A JSX element displaying the time from now
 */
export function TimeFromNow({
  date,
  lower,
  upper
}: {
  /** The date in the past (or future) in a `dayjs` accepted date */
  date: string | number | Dayjs | Date | null | undefined;
  /** Sets the final output string to `lower case` */
  lower?: boolean;
  /** Sets the final output string to `UPPER CASE` */
  upper?: boolean;
}) {
  const timeAgo = useTimeFromNow(
    date,
    upper || lower
      ? { textCase: upper ? "upper" : lower ? "lower" : undefined }
      : undefined
  );
  return <>{timeAgo}</>;
}
