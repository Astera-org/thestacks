import Button from "@/components/stacks-ui/Button";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

export default function ShareLinkRow({
  disabled,
  onToggle,
  shareLinkOn,
  visibility,
}: {
  disabled?: boolean;
  onToggle: () => void;
  shareLinkOn: boolean;
  visibility: "private" | "community";
}) {
  const active = visibility !== "private" && shareLinkOn;
  return (
    <div
      className={cn(
        "border-gray-blue-900/8 mt-4 flex items-center gap-3 rounded-lg border bg-white px-4.5 py-3.5",
        visibility === "private" && "opacity-60"
      )}
    >
      <div className="text-gray-blue-900/70 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-200">
        <Link2 size={16} />
      </div>
      <div className="flex-1">
        <div className="text-carbon-800 text-body-50 flex items-center gap-2 font-medium">
          Share link
          {active ? (
            <span className="text-caption-20 text-success-900 font-mono">
              • Anyone with the link can view
            </span>
          ) : (
            <span className="text-gray-blue-900/65 text-caption-20 font-mono">
              • Disabled {visibility === "private" && "— draft is Private"}
            </span>
          )}
        </div>
        <span
          className={cn(
            "text-gray-blue-900/55 text-caption-10 mt-0.5 block font-mono",
            !active && "line-through"
          )}
        >
          thestacks.org/d/tractability-atlas-draft
        </span>
      </div>
      <Button disabled={!active} intent="outline" size="sm">
        Copy link
      </Button>
      <Button disabled={disabled} intent="outline" size="sm" onClick={onToggle}>
        {active ? "Disable" : "Enable"}
      </Button>
    </div>
  );
}
