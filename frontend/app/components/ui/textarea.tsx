import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, _ref) => {
  // Adjust textarea height when body changes.
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [props.value, adjustHeight]);

  return (
    <textarea
      className={cn(
        "placeholder:text-carbon-400 flex min-h-20 w-full rounded-md border border-gray-700 bg-white px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Stacks UI input styles.
        "text-carbon-700 placeholder:text-gray-blue-300 h-7 rounded-lg bg-white font-sans text-[14px] placeholder:text-[14px] md:h-9 md:text-[16px] md:placeholder:text-[16px]",
        className
      )}
      ref={textareaRef}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
