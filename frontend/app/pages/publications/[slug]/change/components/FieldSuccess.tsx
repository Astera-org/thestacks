import { CheckCircle2 } from "lucide-react";

export default function FieldSuccess({
  message,
}: {
  message: string | string[] | undefined | null;
}) {
  if (!message) return null;

  const messages = !Array.isArray(message) ? [message] : message;

  return messages.map((message, i) => (
    <span
      key={i}
      className="text-success-900 text-caption-30 mt-1 flex items-center gap-2 font-sans"
      role="status"
    >
      <CheckCircle2 className="stroke-success-900" size={14} />
      {message}
    </span>
  ));
}
