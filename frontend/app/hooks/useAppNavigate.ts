import { isHashOnlyTarget } from "@/lib/navigation";
import { useCallback } from "react";
import {
  useNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To
} from "react-router";

/** `useNavigate` with the page transition applied. Importing `useNavigate` directly is an ESLint error. */
export default function useAppNavigate(): NavigateFunction {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      // React Router only accepts the option alongside a target, not a delta.
      if (typeof to === "number") return navigate(to);

      return navigate(to, {
        viewTransition: !isHashOnlyTarget(to),
        ...options
      });
    },
    [navigate]
  );
}
