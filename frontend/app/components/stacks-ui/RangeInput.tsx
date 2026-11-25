import { cn } from "@/lib/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

type RangeInputProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  ref?: React.Ref<React.ComponentRef<typeof SliderPrimitive.Root>>;
};

export default function RangeInput({
  className,
  // The thumb is the focusable `role="slider"` element, so the accessible
  // name belongs on it, not on the root span.
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: RangeInputProps) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="bg-gray-blue-100 relative h-1.5 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-gray-blue-900 absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className="border-gray-blue-900 focus-visible:ring-gray-blue-300 block size-4 rounded-full border-2 bg-white transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  );
}
