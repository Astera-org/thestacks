import { SVGProps } from "react";

export default function ExpandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="var(--color-carbon-300)"
      strokeWidth="5"
      strokeMiterlimit="10"
      aria-hidden="true"
      {...props}
    >
      <g>
        <line x1="52.47" y1="47.53" x2="70" y2="30" />
        <polyline points="70 47.53 70 30 52.47 30" />
      </g>
      <g>
        <line x1="47.53" y1="52.47" x2="30" y2="70" />
        <polyline points="30 52.47 30 70 47.53 70" />
      </g>
      <circle cx="50" cy="50" r="41.83" />
    </svg>
  );
}
