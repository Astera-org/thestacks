import Button from "@/components/stacks-ui/Button";
import {
  DeleteMutation,
  EditPublicationStatus,
} from "@/hooks/use-edit-publication/types";
import { Lock, Plus, Users } from "lucide-react";
import type { AccessState } from "../types";
import DangerZone from "./DangerZone";
import RolePickerButton from "./RolePickerButton";
import Section from "./Section";
import ShareLinkRow from "./ShareLinkRow";
import TeamRow from "./TeamRow";
import VisCard from "./VisCard";

export default function AccessSection({
  access,
  collapsed,
  deleteMutation,
  isReadOnly,
  onPatch,
  onToggleCollapse,
  status,
}: {
  access: AccessState;
  collapsed: boolean;
  deleteMutation: DeleteMutation;
  isReadOnly?: boolean;
  onPatch: <K extends keyof AccessState>(key: K, value: AccessState[K]) => void;
  onToggleCollapse: () => void;
  status: EditPublicationStatus;
}) {
  return (
    <Section
      collapsed={collapsed}
      kicker="Who can edit this draft"
      note={
        <>
          <strong className="text-carbon-800">
            This is different from Contributors.
          </strong>{" "}
          Access controls who can open, edit, or manage this pub inside The
          Stacks — your editorial team and collaborators. Contributors (above)
          are the people credited at the end of the publication.
        </>
      }
      right={
        <Button size="sm">
          <Plus size={12} /> Invite
        </Button>
      }
      status={status}
      title="Access"
      onToggleCollapse={onToggleCollapse}
    >
      <div className="mb-5 grid grid-cols-2 gap-3">
        <VisCard
          active={access.visibility === "private"}
          disabled={isReadOnly}
          icon={<Lock size={16} />}
          sub={
            <>
              Only people invited below can open this draft.
              {access.shareLinkOn && (
                <>
                  {" "}
                  <b>The share link below is disabled</b> while Private.
                </>
              )}
            </>
          }
          title="Private draft"
          onClick={() => onPatch("visibility", "private")}
        />
        <VisCard
          active={access.visibility === "community"}
          disabled={isReadOnly}
          icon={<Users size={16} />}
          sub={`Anyone in ${access.community} can view and comment while you work.`}
          title="Community draft"
          onClick={() => onPatch("visibility", "community")}
        />
      </div>

      <div className="border-gray-blue-900/8 overflow-hidden rounded-xl border bg-white">
        <div className="border-gray-blue-900/8 bg-off-white flex items-center gap-2 border-b p-2.5">
          <Plus className="text-gray-blue-900/50 ml-1.5" size={14} />
          <input
            aria-label="Invite by name, email, or username"
            className="text-caption-30 flex-1 border-0 bg-transparent px-2 py-1 font-sans outline-none"
            disabled={isReadOnly}
            placeholder="Invite by name, email, or username…"
          />
          <RolePickerButton
            disabled={isReadOnly}
            userRole="Editor"
            onChange={() => {}}
          />
          <Button disabled={isReadOnly} size="sm">
            Send invite
          </Button>
        </div>

        <div className="border-gray-blue-900/6 grid grid-cols-[minmax(240px,1.3fr)_minmax(180px,1fr)_140px_36px] gap-4 border-b bg-gray-100 px-6 py-2.5">
          <span className="text-gray-blue-900/55 text-caption-10 font-mono tracking-wide uppercase">
            Person
          </span>
          <span className="text-gray-blue-900/55 text-caption-10 font-mono tracking-wide uppercase">
            Access via
          </span>
          <span className="text-gray-blue-900/55 text-caption-10 font-mono tracking-wide uppercase">
            Role
          </span>
          <span />
        </div>

        {access.members.map((m, i) => (
          <TeamRow
            key={m.id}
            disabled={isReadOnly}
            last={i === access.members.length - 1}
            m={m}
            onChange={(patch) =>
              onPatch(
                "members",
                access.members.map((x) =>
                  x.id === m.id ? { ...x, ...patch } : x
                )
              )
            }
            onRemove={() =>
              onPatch(
                "members",
                access.members.filter((x) => x.id !== m.id)
              )
            }
          />
        ))}
      </div>

      <ShareLinkRow
        disabled={isReadOnly}
        shareLinkOn={access.shareLinkOn}
        visibility={access.visibility}
        onToggle={() => onPatch("shareLinkOn", !access.shareLinkOn)}
      />

      <DangerZone
        /** @todo Add error handling for delete mutation */
        deleteError={null}
        deleteMutation={deleteMutation}
        disabled={isReadOnly}
      />
    </Section>
  );
}
