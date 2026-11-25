import type { UseQueryResult } from "@tanstack/react-query";

/**
 * A stand-in for a `useQuery` result, for components that only read `data`
 * and `isLoading`. Other fields are left unset.
 */
export function queryResult<T>(
  data: T | undefined,
  { isLoading = false }: { isLoading?: boolean } = {}
): UseQueryResult<T> {
  return { data, isLoading } as UseQueryResult<T>;
}
