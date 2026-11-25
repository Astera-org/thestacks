import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export default function FieldLabel({
  children,
  className,
  htmlFor,
  required,
}: {
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  required?: boolean;
}) {
  const Comp = htmlFor ? "label" : "span";

  return (
    <Comp
      className={cn(
        "text-caption-30 text-gray-blue-400 mb-3 block font-mono",
        className
      )}
      htmlFor={htmlFor}
    >
      {children}
      {required && (
        <>
          <span aria-hidden className="text-periwinkle-500 ml-0.5">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </Comp>
  );
}
