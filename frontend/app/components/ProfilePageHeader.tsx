import Avatar from "@/components/stacks-ui/Avatar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { SVGProps } from "react";

interface ProfilePageHeaderProps {
  name: string;
  avatar?: string | null;
  subtitle?: ReactNode;
  /** Adornment shown next to the name, e.g. a ROR link. */
  badge?: ReactNode;
  /** Pill shown under the subtitle, e.g. a publications count. */
  chip?: ReactNode;
  bio?: string | null;
  /** Controls rendered below the bio, e.g. share or manage buttons. */
  actions?: ReactNode;
  className?: string;
}

function HeaderIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="483"
      height="381"
      viewBox="0 0 483 381"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <g opacity="0.2">
        <path
          d="M240.865 0L240.865 380"
          stroke="#262626"
          strokeWidth="0.718645"
          strokeMiterlimit="10"
        />
        <path
          d="M0.359375 0L0.359396 380"
          stroke="#262626"
          strokeWidth="0.718645"
          strokeMiterlimit="10"
        />
        <path
          d="M0.359375 271.141L482.331 271.141"
          stroke="#262626"
          strokeWidth="0.718645"
          strokeMiterlimit="10"
        />
        <path
          d="M1.31738 380L241.807 270.65L241.841 270.624L482.331 161.273"
          stroke="#262626"
          strokeWidth="0.718645"
          strokeMiterlimit="10"
        />
      </g>
    </svg>
  );
}

/**
 * Profile header that shares the frame, dimensions, and background
 * illustration of `MetaPageHeader`, laid out for an avatar-led identity.
 */
export default function ProfilePageHeader(props: ProfilePageHeaderProps) {
  const { name, avatar, subtitle, badge, chip, bio, actions, className } =
    props;

  return (
    <div
      className={cn(
        "text-fg-strong relative overflow-clip py-14 md:py-20",
        className
      )}
    >
      <HeaderIllustration className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-20 md:w-auto xl:opacity-100" />
      <div className="max-w-container mx-auto flex w-full flex-col gap-7 px-4 md:px-8">
        {/* Identity: avatar, name, subtitle, and chip. */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-4">
          <div className="shrink-0">
            <Avatar
              src={avatar}
              alt={name}
              className="border-border-strong bg-surface size-22 border md:size-31"
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-body-70">{name}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-caption-50 text-fg-strong mt-1 font-mono">
                {subtitle}
              </p>
            )}
            {chip && <div className="mt-4">{chip}</div>}
          </div>
        </div>

        {bio && <p className="text-body-40 max-w-3xl">{bio}</p>}

        {actions && (
          <div className="flex flex-wrap items-center gap-3 md:gap-8">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
