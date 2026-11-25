import { downloadFromUrl } from "@/lib/utils";
import { CLASSES } from "@thestacks/myst-renderer";
import { type ComponentPropsWithoutRef, useRef } from "react";

import FigureLegend from "./FigureLegend";

interface MystDivProps extends ComponentPropsWithoutRef<"div"> {
  node?: any;
}

/**
 * Custom <div> component for react-markdown.
 * Delegates to specialized components based on className.
 */
export default function MystDiv({
  node: _node,
  children,
  className,
  ...props
}: MystDivProps) {
  const classes = className?.split(/\s+/) || [];

  // Figure legend -> FigureLegend with truncation support
  if (classes.includes("figure-legend")) {
    return (
      <FigureLegend className={className} {...props}>
        {children}
      </FigureLegend>
    );
  }

  // Standalone audio action target -> AudioWrapper with download handler
  if (classes.includes(CLASSES.AUDIO_ACTION_TARGET)) {
    return (
      <AudioWrapper className={className} {...props}>
        {children}
      </AudioWrapper>
    );
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Wrapper for standalone audio elements with action buttons.
 * Handles the download button click.
 */
function AudioWrapper({ children, ...props }: ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = async (e: React.MouseEvent) => {
    const button = (e.target as HTMLElement).closest(
      `.${CLASSES.FIGURE_ACTION_BUTTON}`
    ) as HTMLElement | null;
    if (!button || !ref.current) return;

    const ariaLabel = button.getAttribute("aria-label");
    if (ariaLabel !== "Download") return;

    e.preventDefault();
    const audio = ref.current.querySelector("audio") as HTMLAudioElement | null;
    if (!audio?.src) return;

    let filename = "download";
    try {
      filename = new URL(audio.src).pathname.split("/").pop() || "download";
    } catch {
      // ignore
    }

    await downloadFromUrl(audio.src, filename);
  };

  return (
    <div ref={ref} onClick={handleClick} {...props}>
      {children}
    </div>
  );
}
