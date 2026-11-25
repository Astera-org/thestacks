import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Brand-styled sonner outlet. Matches the dark dropdown surface: gray-blue-900
 * card, gray-blue-700 border, white text, with accent-colored icons per type.
 */
export default function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      offset={48}
      gap={8}
      visibleToasts={5}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />
      }}
      style={
        {
          "--normal-bg": "var(--color-gray-blue-900)",
          "--normal-text": "var(--color-white)",
          "--normal-border": "var(--color-gray-blue-700)",
          "--border-radius": "0.75rem"
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-xl",
          success: "[&_[data-icon]]:text-mint-green-800",
          error: "[&_[data-icon]]:text-error-800",
          warning: "[&_[data-icon]]:text-butter-yellow-500",
          info: "[&_[data-icon]]:text-sky-blue-300"
        }
      }}
      {...props}
    />
  );
}
