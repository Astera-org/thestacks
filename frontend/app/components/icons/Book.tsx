import { SVGProps } from "react";

export default function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M18.31,34.83V12.01h0c-3.56-4.38-8.39-6.84-13.42-6.84h-1.41v22.83h1.41c5.03,0,9.86,2.46,13.42,6.84h0Z" />
      <path d="M21.69,34.83V12.01h0c3.56-4.38,8.39-6.84,13.42-6.84h1.41v22.83h-1.41c-5.03,0-9.86,2.46-13.42,6.84h0Z" />
    </svg>
  );
}
