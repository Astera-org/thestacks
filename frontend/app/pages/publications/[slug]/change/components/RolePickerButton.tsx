import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { ROLE_DEFS } from "../exampleData";

export default function RolePickerButton({
  disabled,
  locked,
  onChange,
  userRole,
}: {
  disabled?: boolean;
  locked?: boolean;
  onChange: (v: string) => void;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-expanded={locked ? undefined : open}
        className={cn(
          "border-gray-blue-900/12 text-carbon-800 text-caption-30 inline-flex items-center gap-1.5 rounded-md border bg-white py-1.5 pr-2.5 pl-3 font-sans font-medium",
          locked ? "cursor-default opacity-70" : "cursor-pointer"
        )}
        disabled={disabled}
        onClick={() => !locked && setOpen(!open)}
      >
        {userRole}
        {!locked && <ChevronDown size={10} />}
      </button>
      {open && !locked && (
        <>
          <button
            aria-label="Close Choose Role Menu"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="border-gray-blue-900/10 absolute top-[calc(100%+4px)] right-0 z-20 w-70 rounded-xl border bg-white p-1.5 shadow-lg">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-gray-blue-900/55 text-caption-10 font-mono tracking-wide uppercase">
                Choose role
              </span>
            </div>
            {ROLE_DEFS.map((r) => (
              <button
                key={r.v}
                aria-pressed={r.v === userRole}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md p-2.5 text-left",
                  r.v === userRole && "bg-gray-blue-900/4"
                )}
                disabled={disabled}
                onClick={() => {
                  onChange(r.v);
                  setOpen(false);
                }}
              >
                <div className="w-4">
                  {r.v === userRole && <Check size={13} />}
                </div>
                <div>
                  <div className="text-carbon-800 text-caption-30 font-sans font-medium">
                    {r.v}
                  </div>
                  <span className="text-gray-blue-900/60 text-caption-10 mt-0.5 block">
                    {r.d}
                  </span>
                </div>
              </button>
            ))}
            <div className="bg-gray-blue-900/8 my-1.5 h-px" />
            <button
              className="flex w-full items-start gap-2 rounded-md p-2.5 text-left"
              disabled={disabled}
            >
              <div className="text-error-900 w-4">
                <X size={12} />
              </div>
              <div>
                <div className="text-error-900 text-caption-30 font-sans font-medium">
                  Remove access
                </div>
                <span className="text-gray-blue-900/50 text-caption-10 mt-0.5 block">
                  They&rsquo;ll lose access immediately
                </span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
