import { cn } from "@/lib/utils";
import { PublicationState } from "@/types";

interface PublicationStateBannerProps {
  state: PublicationState;
}

export default function PublicationStateBanner(
  props: PublicationStateBannerProps
) {
  const { state } = props;
  return (
    <div
      className={cn(
        "w-full border py-3 text-center font-sans text-sm font-medium md:text-base",
        state === "DRAFT" && "bg-pub-banner-draft",
        state === "DELETED" && "bg-pub-banner-deleted"
      )}
    >
      {state === "DRAFT" &&
        "Draft. This publication is visible only to contributors."}
      {state === "DELETED" &&
        "REMOVED. This publication has been removed. See below for an explanation."}
    </div>
  );
}
