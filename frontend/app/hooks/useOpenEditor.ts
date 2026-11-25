import { postEditPublication } from "@/apiv1/publications";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Opens a publication in the editor. The backend gets or creates its draft
 * (a new version for a released pub) and returns the id the editor route needs.
 */
export function useOpenEditor(slug: string) {
  const navigate = useAppNavigate();

  const mutation = useMutation({
    mutationFn: () => postEditPublication(slug),
    onSuccess: ({ publicationId }) => {
      navigate(`/publications/${publicationId.toLowerCase()}/edit`);
    },
    onError: () => {
      toast.error("Couldn't open the editor. Please try again.");
    },
    retry: false
  });

  const isOpening = mutation.isPending || mutation.isSuccess;

  return {
    isOpening,
    openEditor: () => {
      if (!isOpening) mutation.mutate();
    }
  };
}
