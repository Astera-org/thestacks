import Button from "@/components/stacks-ui/Button";
import useAppNavigate from "@/hooks/useAppNavigate";
import { Lock } from "lucide-react";

export default function NoAccessState() {
  const navigate = useAppNavigate();

  return (
    <div className="mx-auto flex w-full max-w-321 flex-col items-center justify-center px-4 py-24 text-center md:px-8 md:py-32">
      <Lock aria-hidden className="stroke-fg-subtle mb-6" size={40} />
      <h1 className="text-headline-30 text-fg-strong mb-3 font-serif">
        You don't have access to this publication
      </h1>
      <p className="text-body-30 text-fg-muted mb-8 max-w-md font-sans">
        This draft is only visible to its contributors and members of its
        organizations. If you need access, ask a contributor to add you.
      </p>
      <Button onClick={() => navigate("/account/publications")}>
        Back to publications
      </Button>
    </div>
  );
}
