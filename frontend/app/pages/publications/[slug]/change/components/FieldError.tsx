import { AlertTriangle } from "lucide-react";

export default function FieldError({
  announce,
  id,
  message,
}: {
  /** Announce immediately; for errors that follow an action, not field validation. */
  announce?: boolean;
  /** Lets the owning field point `aria-describedby` at the message. */
  id?: string;
  message: string | string[] | undefined | null;
}) {
  if (!message) return null;

  const messages = !Array.isArray(message) ? [message] : message;
  const items = messages.map((message, i) => (
    <span
      key={i}
      className="text-error-900 text-caption-30 mt-1 flex items-center gap-2 font-sans"
    >
      <AlertTriangle className="stroke-error-900" size={14} />
      {message}
    </span>
  ));

  if (!id && !announce) return items;
  return (
    <div id={id} role={announce ? "alert" : undefined}>
      {items}
    </div>
  );
}
