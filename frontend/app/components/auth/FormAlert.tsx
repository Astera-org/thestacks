import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const formAlertVariants = cva(
  "flex min-h-12 items-center rounded-lg border px-6 py-3 text-sm",
  {
    variants: {
      intent: {
        success: "border-success-700 bg-success-700 text-success-900",
        error: "border-error-700 bg-error-700 text-error-900"
      }
    },
    defaultVariants: {
      intent: "error"
    }
  }
);

interface FormAlertProps extends VariantProps<typeof formAlertVariants> {
  children: React.ReactNode;
  className?: string;
}

/** A success or error message shown inside the auth forms. */
export default function FormAlert({
  children,
  intent,
  className
}: FormAlertProps) {
  return (
    <div
      role={intent === "success" ? "status" : "alert"}
      className={cn(formAlertVariants({ intent }), className)}
    >
      {children}
    </div>
  );
}
