import { SVGProps } from "react";

export default function GoogleDocsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        fill="#4285F4"
      />
      <path d="M14 2v6h6z" fill="#A1C2FA" />
      <path d="M8 13h8v1H8zM8 16h8v1H8zM8 10h5v1H8z" fill="#fff" />
    </svg>
  );
}
