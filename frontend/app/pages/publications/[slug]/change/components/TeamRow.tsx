import Button from "@/components/stacks-ui/Button";
import { cn } from "@/lib/utils";
import { Loader, Users, X } from "lucide-react";
import type { TeamMember } from "../types";
import RolePickerButton from "./RolePickerButton";

export default function TeamRow({
  disabled,
  last,
  m,
  onChange,
  onRemove,
}: {
  disabled?: boolean;
  last: boolean;
  m: TeamMember;
  onChange: (patch: Partial<TeamMember>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group/team-row grid grid-cols-[minmax(240px,1.3fr)_minmax(180px,1fr)_140px_36px] items-center gap-4 px-6 py-3.5 transition-colors",
        !last && "border-gray-blue-900/6 border-b",
        "group-hover/team-row:bg-gray-blue-900/2"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            m.avatarClass
          )}
        >
          {m.isTeam ? (
            <Users size={14} />
          ) : (
            m.name
              .trim()
              .split(/\s+/)
              .filter((_, i, words) => i === 0 || i === words.length - 1)
              .map((x) => x[0])
              .join("")
              .toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="text-carbon-800 text-caption-30 flex items-center gap-2 font-sans font-medium">
            {m.name}
            {m.you && (
              <span className="bg-gray-blue-900/8 text-gray-blue-900/60 text-caption-10 rounded px-1.5 py-0.5 font-mono tracking-wide uppercase">
                you
              </span>
            )}
          </div>
          <span className="text-gray-blue-900/55 text-caption-10 font-mono">
            {m.email}
          </span>
        </div>
      </div>

      <div>
        {m.alsoContributor ? (
          <span
            className="bg-pistachio-200 text-pistachio-900 text-caption-10 inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono font-semibold"
            title="This person is also on the byline"
          >
            <Loader size={10} /> Also a contributor
          </span>
        ) : m.isTeam ? (
          <span className="text-gray-blue-900/65 text-caption-20 font-mono">
            Inherited from organization
          </span>
        ) : (
          <span className="text-gray-blue-900/55 text-caption-20 font-mono">
            Direct invite
          </span>
        )}
      </div>

      <RolePickerButton
        locked={m.you || disabled}
        userRole={m.role}
        onChange={(v) => onChange({ role: v })}
      />

      <Button
        aria-label={`Remove ${m.name}`}
        className={!m.you ? "group-hover/team-row:opacity-100" : "opacity-0"}
        disabled={m.you || disabled}
        intent="outline"
        size="sm"
        onClick={onRemove}
      >
        <X size={13} />
      </Button>
    </div>
  );
}
