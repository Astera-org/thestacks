import Button from "@/components/stacks-ui/Button";
import useAppNavigate from "@/hooks/useAppNavigate";
import { FileQuestion } from "lucide-react";

export default function NotFoundState() {
  const navigate = useAppNavigate();

  return (
    <div className="mx-auto flex w-full max-w-321 flex-col items-center justify-center px-4 py-24 text-center md:px-8 md:py-32">
      <FileQuestion aria-hidden className="stroke-fg-subtle mb-6" size={40} />
      <h1 className="text-headline-30 text-fg-strong mb-3 font-serif">
        We couldn't find this draft
      </h1>
      <p className="text-body-30 text-fg-muted mb-8 max-w-md font-sans">
        The publication may have been deleted, or its draft may already have
        been released. Check that the link is correct.
      </p>
      <Button onClick={() => navigate("/account/publications")}>
        Back to publications
      </Button>
    </div>
  );
}
