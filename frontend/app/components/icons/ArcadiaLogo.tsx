import { cn } from "@/lib/utils";
import { SVGProps } from "react";

export default function ArcadiaLogoIcon(props: SVGProps<SVGSVGElement>) {
  const { className } = props;
  return (
    <div
      className={cn(
        "bg-carbon-500 relative aspect-square h-4! w-4! rounded-full p-1",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 13 11"
        fill="none"
        style={{
          width: "12px",
          height: "auto"
        }}
      >
        <path
          d="M6.42266 0H5.92036L0 10.0934L0.235834 10.501H12.0122L12.2481 10.0934L6.42266 0ZM8.28483 5.74565V8.1369L7.366 9.04268V8.04934L7.27718 7.84403L6.47779 7.17376V5.89057L8.19295 4.19979L9.7029 6.79635L8.87289 7.61457V5.77584H8.28177V5.74565H8.28483ZM5.68147 9.04268L2.1317 7.55418L3.40275 5.36522L6.77488 8.19426V9.94543H5.82848V9.33252L5.68147 9.03966V9.04268ZM6.45022 1.19563L7.89892 3.67444L6.45022 5.10254V1.19563ZM5.88974 6.70879L5.26799 6.18344V4.14242H4.70444V5.68828L3.72741 4.87006L5.88667 1.16543V6.70879H5.88974ZM1.83461 8.05236L5.29556 9.48047V9.91826H0.741194L1.83461 8.05236ZM7.36906 9.94845V9.86089L10.0031 7.29453L11.5406 9.94845H7.36906Z"
          fill="var(--color-white)"
        />
      </svg>
    </div>
  );
}
