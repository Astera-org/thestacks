import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "file:text-carbon-700 placeholder:text-carbon-400 flex h-10 w-full rounded-md border border-gray-700 bg-white px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Stacks UI input styles.
          "text-carbon-700 placeholder:text-gray-blue-300 h-7 rounded-lg bg-white font-sans text-[14px] placeholder:text-[14px] md:h-9 md:text-[16px] md:placeholder:text-[16px]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
