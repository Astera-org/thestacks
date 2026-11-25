import useGlobalPendingState from "@/hooks/useGlobalPendingState";
import N from "nprogress";
import { useEffect } from "react";

// Configure NProgress settings once.
N.configure({
  showSpinner: false,
  trickleSpeed: 50
});

/**
 * Automatically show NProgress loading bar on route changes and fetcher activity.
 */
export default function NProgress() {
  const state = useGlobalPendingState();

  useEffect(() => {
    if (state === "pending") {
      N.start();
    } else {
      N.done();
    }

    return () => {
      N.done();
    };
  }, [state]);

  return null;
}
