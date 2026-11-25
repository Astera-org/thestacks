import { CopyIcon } from "@/components/icons";
import Tooltip from "@/components/stacks-ui/Tooltip";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useCallback, useState } from "react";

interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  className?: string;
  tooltipContent?: string;
  /** Tooltip color treatment. Use "light" over dark surfaces. Defaults to "dark". */
  tooltipVariant?: "dark" | "light";
}

export default function CopyButton(props: CopyButtonProps) {
  const { text, className, tooltipContent, tooltipVariant, ...rest } = props;

  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [text]);

  const label = tooltipContent || "Copy";

  return (
    <Tooltip label={label} side="top" variant={tooltipVariant}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "bg-carbon-700 hover:bg-info-900 w-6 shrink-0 rounded-full p-1 hover:opacity-75",
          className
        )}
        onClick={handleCopy}
        {...rest}
      >
        {isCopied ? (
          <CheckIcon className="text-fg-inverted h-full w-full" />
        ) : (
          <CopyIcon className="text-fg-inverted h-full w-full" />
        )}
      </button>
    </Tooltip>
  );
}
