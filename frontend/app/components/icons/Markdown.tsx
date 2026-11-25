import { SVGProps } from "react";

export default function MarkdownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <text
        x="10"
        y="11"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
      >
        md
      </text>
    </svg>
  );
}
