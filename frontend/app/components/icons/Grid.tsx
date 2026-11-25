import { SVGProps } from "react";

export default function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3.5 12.8333V3.5H12.8333V12.8333H3.5ZM3.5 24.5V15.1667H12.8333V24.5H3.5ZM15.1667 12.8333V3.5H24.5V12.8333H15.1667ZM15.1667 24.5V15.1667H24.5V24.5H15.1667Z"
        fill="currentColor"
      />
    </svg>
  );
}
