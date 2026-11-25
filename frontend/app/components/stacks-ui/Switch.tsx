import { SpinnerIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  ref?: React.Ref<React.ComponentRef<typeof SwitchPrimitive.Root>>;
  /** Shows a spinner in the thumb while an update is in flight. */
  pending?: boolean;
};

export default function Switch({ className, pending, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "data-[state=checked]:bg-gray-blue-900 data-[state=unchecked]:bg-gray-blue-200 peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none flex size-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 motion-reduce:transition-none">
        {pending && (
          <SpinnerIcon className="text-gray-blue-700 size-3 animate-spin" />
        )}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
