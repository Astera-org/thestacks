import { SVGProps } from "react";

export default function GraphIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0.155273 9.29299L4.12794 7.9922L8.42873 2.78906L10.4092 5.07422L12.8936 2.87109"
        stroke="currentColor"
        strokeMiterlimit="10"
      />
      <path
        d="M0.424805 0V13.1016H12.3194"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeMiterlimit="10"
      />
    </svg>
  );
}
