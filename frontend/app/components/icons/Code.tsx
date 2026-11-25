import { SVGProps } from "react";

export default function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="9"
      viewBox="0 0 18 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0 5.1211L5.41408 7.91017V6.48048L1.7461 4.64063L5.41408 2.80078V1.38281L0 4.17188V5.1211Z"
        fill="currentColor"
      />
      <path
        d="M6.77344 8.12111H8.14454L11.2734 0H9.90235L6.77344 8.12111Z"
        fill="currentColor"
      />
      <path
        d="M11.8594 1.38281V2.80078L15.5508 4.64063L11.8594 6.48048V7.91017L17.2735 5.1211V4.16016L11.8594 1.38281Z"
        fill="currentColor"
      />
    </svg>
  );
}
