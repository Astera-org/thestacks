import { SVGProps } from "react";

export default function ExpandFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M50,8.17c-23.1,0-41.83,18.73-41.83,41.83s18.73,41.83,41.83,41.83,41.83-18.73,41.83-41.83S73.1,8.17,50,8.17ZM47.53,68v4h-19.53v-19.53h4v12.7l14.12-14.12,2.83,2.83-14.12,14.12h12.7ZM72,47.53h-4v-12.7l-14.12,14.12-2.83-2.83,14.12-14.12h-12.7v-4h19.53v19.53Z" />
    </svg>
  );
}
