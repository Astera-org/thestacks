import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { useMemo } from "react";

export interface ReferenceLinkInfo {
  refNum: number;
  /** Absent for a MyST bibliography entry with no DOI or URL. */
  url?: string;
  text: string;
}

export function sortedLinkInfos(linkInfos: ReferenceLinkInfo[]) {
  return linkInfos.slice().sort((a, b) => a.refNum - b.refNum);
}

export function linkInfoLabel(linkInfos: ReferenceLinkInfo[]) {
  const nums = linkInfos.map((info) => info.refNum).sort((a, b) => a - b);
  const groups: string[] = [];
  let i = 0;
  while (i < nums.length) {
    const start = i;
    while (i + 1 < nums.length && nums[i + 1] === nums[i] + 1) {
      i++;
    }
    const runLength = i - start + 1;
    if (runLength >= 2) {
      groups.push(`${nums[start]}\u2013${nums[i]}`);
    } else {
      for (let j = start; j <= i; j++) {
        groups.push(String(nums[j]));
      }
    }
    i++;
  }
  return groups.join(",\u202F");
}

interface ReferencePopoverProps {
  linkInfos: ReferenceLinkInfo[];
}
/**
 * A numbered citation badge whose popover lists the cited references. Shared
 * by the Google Docs renderer (`MystSpan`) and the MyST one (`mystmd/`).
 */
export default function ReferencePopover({ linkInfos }: ReferencePopoverProps) {
  const sorted = useMemo(() => sortedLinkInfos(linkInfos), [linkInfos]);
  const label = linkInfoLabel(linkInfos);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <a
          role="button"
          tabIndex={0}
          className="hover:text-link ref-link-popover-trigger"
          aria-label="Reference Details"
        >
          <span className="ref-link-popover-label">{label}</span>
        </a>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-100 p-3">
        <div className="ref-link-popover-content">
          <ReferenceLinkList linkInfos={sorted} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The references a popover lists, in the order given. Also used by MyST
 * footnote popovers for the references a footnote cites.
 */
export function ReferenceLinkList({
  linkInfos
}: {
  linkInfos: ReferenceLinkInfo[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {linkInfos.map((info) => (
        <li
          key={info.refNum}
          className="text-fg-inverted flex flex-row gap-2 leading-snug"
        >
          <div className="font-mono break-normal">{info.refNum}</div>
          <div>
            {info.text && <div>{info.text}</div>}
            {info.url && (
              <div className="underline underline-offset-4">
                <a href={info.url} target="_blank" rel="noopener noreferrer">
                  {info.url}
                </a>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
