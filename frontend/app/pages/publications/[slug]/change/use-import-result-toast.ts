import useAppNavigate from "@/hooks/useAppNavigate";
import { PublicationV1 } from "@/types/v1";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";

/** Navigation state the new-pub page sets when it opens a freshly imported draft. */
export type ImportResultState = { justImported: true };

const TOAST_ID = "import-result";

function isJustImported(state: unknown): boolean {
  return (state as Partial<ImportResultState> | null)?.justImported === true;
}

/**
 * After an import opens this page, says whether it went cleanly once the
 * draft has loaded, going by the same diagnostics the Import issues section
 * lists. The navigation state is cleared so a reload or Back doesn't repeat it.
 */
export function useImportResultToast(publication: PublicationV1 | undefined) {
  const location = useLocation();
  const navigate = useAppNavigate();
  const justImported = isJustImported(location.state);
  const hasDiagnostics = Boolean(
    publication?.importDocument?.diagnostics?.length
  );
  const isLoaded = publication !== undefined;

  useEffect(() => {
    if (!justImported || !isLoaded) return;

    navigate(location.pathname + location.search + location.hash, {
      replace: true,
      state: null,
      viewTransition: false,
    });
    // The id keeps a repeated effect (e.g. StrictMode) from stacking toasts.
    if (hasDiagnostics) {
      toast.warning(
        "Google Doc imported, but some problems were found. Check Import issues.",
        { id: TOAST_ID }
      );
    } else {
      toast.success("Google Doc imported successfully.", { id: TOAST_ID });
    }
  }, [
    hasDiagnostics,
    isLoaded,
    justImported,
    location.hash,
    location.pathname,
    location.search,
    navigate,
  ]);
}
