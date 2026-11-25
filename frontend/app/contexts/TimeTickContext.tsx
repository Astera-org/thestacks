import dayjs, { Dayjs } from "dayjs";
import { createContext, useEffect, useState } from "react";

/**
 * A React context that provides the current time, updated every minute.
 * Components that need to display time-sensitive information can consume this
 * context to ensure they re-render at appropriate intervals.
 *
 * Using a context for the current time allows for a centralized and efficient
 * way to manage time updates across the application, reducing the need for
 * multiple intervals and ensuring consistent time representation.
 */
export const TimeTickContext = createContext<Dayjs>(dayjs());

export function TimeTickProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    /**
     * This component should not modify the dom or render any visible elements.
     * Its efficiency relies on the fact that it only provides a context value
     * and does not introduce any additional rendering overhead.
     */
    <TimeTickContext.Provider value={now}>{children}</TimeTickContext.Provider>
  );
}
