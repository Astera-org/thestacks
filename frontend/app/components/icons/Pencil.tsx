import { SVGProps } from "react";

export default function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <polygon points="31.71 17.1 16.15 32.65 2.95 37.05 7.35 23.85 22.9 8.29 31.71 17.1" />
      <path d="M24.66,6.53l1.76-1.76c2.43-2.43,6.37-2.43,8.8,0h0c2.43,2.43,2.43,6.37,0,8.8l-1.76,1.76-8.8-8.8Z" />
    </svg>
  );
}
