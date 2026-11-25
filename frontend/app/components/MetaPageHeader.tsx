import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

interface MetaPageHeaderProps {
  title: string;
  subtitle: string;
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

export default function MetaPageHeader(props: MetaPageHeaderProps) {
  const { title, subtitle, className } = props;

  return (
    <div
      className={cn(
        "text-fg-strong relative overflow-clip py-14 md:py-20",
        className
      )}
    >
      <HeaderIllustration className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-20 md:w-auto xl:opacity-100" />
      <div className="max-w-container mx-auto flex w-full flex-col gap-10 px-4 md:px-8">
        <h1 className="text-headline-70 font-serif">{title}</h1>
        <h2 className="text-body-40 max-w-3xl font-sans">{subtitle}</h2>
      </div>
    </div>
  );
}
