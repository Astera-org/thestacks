import {
  AddIcon,
  ArrowUpIcon,
  BookIcon,
  CodeIcon,
  GraphIcon,
  ListIcon,
  OpenInNewIcon,
  Print3DIcon,
  TestTubeIcon
} from "@/components/icons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { cn } from "@/lib/utils";
import { LINKED_ASSET_TYPES, LinkedAsset, LinkedAssetType } from "@/types";
import { useMeasure } from "@uidotdev/usehooks";
import { ComponentType, SVGProps, useId, useMemo, useState } from "react";

const MAX_ICONS = 4;
// One 32px circle plus its 4px gap.
const CIRCLE_SLOT = 36;
// Count margin, chevron and a minimum gap before the chevron.
const PILL_CHROME = 8 + 20 + 8;

interface TypeGlyphSpec {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Size inside the pill's circle. */
  circle: string;
  /** Size in the dropdown rows. */
  row: string;
}

// The existing icons are drawn on very different canvases (13x13 plus, 18x9 code,
// 8x17 test tube, a padded 28x28 list), so each gets its own size to keep their
// visual weight even.
const TYPE_GLYPHS: Record<
  Exclude<LinkedAssetType, LinkedAssetType.CodeAndData>,
  TypeGlyphSpec
> = {
  [LinkedAssetType.Code]: { Icon: CodeIcon, circle: "size-4.5", row: "size-5" },
  [LinkedAssetType.Data]: {
    Icon: GraphIcon,
    circle: "size-3.5",
    row: "size-4"
  },
  [LinkedAssetType.Material]: {
    Icon: TestTubeIcon,
    circle: "h-4 w-auto",
    row: "h-4.5 w-auto"
  },
  [LinkedAssetType.Protocol]: {
    Icon: ListIcon,
    circle: "size-5",
    row: "-ml-0.75 size-6"
  },
  [LinkedAssetType.ThreeDPrinting]: {
    Icon: Print3DIcon,
    circle: "h-4.5 w-auto",
    row: "h-5 w-auto"
  },
  [LinkedAssetType.CompanionPub]: {
    Icon: BookIcon,
    circle: "size-4",
    row: "-ml-px size-4.5"
  },
  [LinkedAssetType.Other]: { Icon: AddIcon, circle: "size-3", row: "size-3.5" }
};

interface TypeGlyphProps {
  type: LinkedAssetType;
  placement: "circle" | "row";
}

/** The existing per-type icon; "Code + data" shows the Code and Data icons together. */
function TypeGlyph(props: TypeGlyphProps) {
  const { type, placement } = props;

  if (type === LinkedAssetType.CodeAndData) {
    return (
      <span className="flex shrink-0 items-center gap-0.5">
        <CodeIcon className="size-3" />
        <GraphIcon className="size-3" />
      </span>
    );
  }

  const { Icon, circle, row } = TYPE_GLYPHS[type];
  return (
    <Icon className={cn("shrink-0", placement === "circle" ? circle : row)} />
  );
}

function pluralizeTypeAsNeeded(type: LinkedAssetType, count: number) {
  if (count === 1) return type;

  switch (type) {
    case LinkedAssetType.CompanionPub:
    case LinkedAssetType.Material:
    case LinkedAssetType.Protocol:
    case LinkedAssetType.ThreeDPrinting:
      return `${type}s`;
    default:
      return type;
  }
}

/** Short "where it lives" line, e.g. "GitHub · owner/repo" or "data.sbgrid.org". */
export function describeAssetSource(url: string) {
  // This runs during render, and both `new URL` and `decodeURIComponent` throw on malformed input.
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = decodeURIComponent(parsed.pathname).replace(/\/+$/, "");

    if (host === "github.com") {
      const repo = path.split("/").filter(Boolean).slice(0, 2).join("/");
      return repo ? `GitHub · ${repo}` : "GitHub";
    }
    if (host === "doi.org" || host === "dx.doi.org") {
      return `DOI ${path.replace(/^\//, "")}`;
    }
    return `${host}${path}`;
  } catch {
    return url;
  }
}

interface TypeCircleProps {
  type: LinkedAssetType;
  isOpen: boolean;
}

function TypeCircle(props: TypeCircleProps) {
  const { type, isOpen } = props;

  return (
    <span
      title={type}
      className={cn(
        "text-fg-inverted flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
        isOpen ? "bg-gray-blue-700" : "bg-gray-blue-900"
      )}
    >
      <TypeGlyph type={type} placement="circle" />
    </span>
  );
}

interface LinkedAssetsProps {
  linkedAssets: LinkedAsset[];
}

export default function LinkedAssets(props: LinkedAssetsProps) {
  const { linkedAssets } = props;
  const [isOpen, setIsOpen] = useState(false);
  const labelId = useId();
  const countId = useId();
  const [pillRef, { width: pillWidth }] = useMeasure<HTMLButtonElement>();
  const [countRef, { width: countWidth }] = useMeasure<HTMLSpanElement>();

  // Group linked assets by type. Follow the order used in LinkedAssetType.
  const groups = useMemo(
    () =>
      LINKED_ASSET_TYPES.map((type) => ({
        type,
        assets: linkedAssets.filter((la) => la.type === type)
      })).filter((group) => group.assets.length > 0),
    [linkedAssets]
  );

  if (groups.length === 0) return null;

  const total = groups.reduce((sum, group) => sum + group.assets.length, 0);
  // Narrow columns fit fewer circles; the rest collapse into the +N circle.
  const maxIcons =
    pillWidth && countWidth
      ? Math.min(
          MAX_ICONS,
          Math.max(
            1,
            Math.floor((pillWidth - countWidth - PILL_CHROME + 4) / CIRCLE_SLOT)
          )
        )
      : MAX_ICONS;
  const hasOverflow = groups.length > maxIcons;
  const visibleCount = maxIcons - 1;
  const visibleGroups = hasOverflow ? groups.slice(0, visibleCount) : groups;
  const hiddenGroups = hasOverflow ? groups.slice(visibleCount) : [];

  return (
    <div>
      <p id={labelId} className="text-caption-40 text-fg-strong mb-3 font-mono">
        Additional assets
      </p>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          ref={pillRef}
          aria-labelledby={`${labelId} ${countId}`}
          className={cn(
            "border-gray-blue-900 flex h-11 w-full cursor-pointer items-center rounded-full border pr-3.5 pl-1.25 transition-colors",
            isOpen
              ? "bg-gray-blue-900 text-fg-inverted"
              : "text-fg-strong hover:bg-white/60"
          )}
        >
          <span className="flex shrink-0 items-center gap-1">
            {visibleGroups.map(({ type }) => (
              <TypeCircle key={type} type={type} isOpen={isOpen} />
            ))}
            {hasOverflow && (
              <span
                title={hiddenGroups
                  .map(({ type, assets }) =>
                    pluralizeTypeAsNeeded(type, assets.length)
                  )
                  .join(", ")}
                className={cn(
                  "text-caption-30 text-fg-inverted flex size-8 shrink-0 items-center justify-center rounded-full font-mono transition-colors",
                  isOpen ? "bg-gray-blue-700" : "bg-gray-blue-900"
                )}
              >
                +{hiddenGroups.length}
              </span>
            )}
          </span>
          <span
            ref={countRef}
            id={countId}
            className="text-caption-50 ml-2 shrink-0 font-mono whitespace-nowrap"
          >
            {total} {total === 1 ? "asset" : "assets"}
          </span>
          <ArrowUpIcon
            className={cn(
              "ml-auto size-5 shrink-0 transition-transform motion-reduce:transition-none",
              !isOpen && "rotate-180"
            )}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-label="Additional assets"
          className="max-h-[min(30rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) min-w-0 overflow-y-auto p-1.5 lg:w-135"
        >
          {groups.map(({ type, assets }, groupIdx) => {
            return (
              <div
                key={type}
                className={cn(
                  groupIdx > 0 && "mt-1.5 border-t border-white/14 pt-1.5"
                )}
              >
                {assets.map((asset, idx) => (
                  <a
                    key={idx}
                    href={asset.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="hover:bg-menu-hover focus-visible:bg-menu-hover grid grid-cols-[1.75rem_1fr_1rem] gap-4 rounded-lg px-3.5 py-3 outline-hidden transition-colors lg:grid-cols-[6rem_1fr_1rem]"
                  >
                    <span className="text-caption-20 lg:text-caption-30 text-gray-blue-200 flex items-start gap-2 font-mono">
                      {idx === 0 && (
                        <>
                          <span className="flex h-lh w-6.5 shrink-0 items-center justify-start">
                            <TypeGlyph type={type} placement="row" />
                          </span>
                          <span className="hidden lg:inline">{type}</span>
                        </>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      {idx === 0 && (
                        <span className="text-caption-20 text-gray-blue-200 font-mono lg:hidden">
                          {type}
                        </span>
                      )}
                      <span className="text-body-20 text-fg-inverted font-sans">
                        <MarkdownRenderer
                          markdown={asset.name || asset.url}
                          isAnchorChild
                        />
                      </span>
                      <span className="text-caption-20 text-gray-blue-200 truncate font-mono">
                        {describeAssetSource(asset.url)}
                      </span>
                    </span>
                    <OpenInNewIcon className="text-gray-blue-200 mt-0.5 size-4" />
                  </a>
                ))}
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
