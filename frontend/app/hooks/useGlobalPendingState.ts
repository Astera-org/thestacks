import { useMemo } from "react";
import { useFetchers, useNavigation, useRevalidator } from "react-router";

/** `"pending"` while a navigation, revalidation, or any fetcher is in flight. */
export default function useGlobalPendingState() {
  const { state: navigationState } = useNavigation();
  const { state: revalidatorState } = useRevalidator();
  const fetchers = useFetchers();

  return useMemo(() => {
    const states = [
      navigationState,
      revalidatorState,
      ...fetchers.map((fetcher) => fetcher.state)
    ];

    return states.includes("loading") || states.includes("submitting")
      ? "pending"
      : "idle";
  }, [navigationState, revalidatorState, fetchers]);
}
