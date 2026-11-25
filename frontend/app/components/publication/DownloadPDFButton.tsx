import { PDFIcon } from "@/components/icons";
import IconButton from "@/components/stacks-ui/IconButton";
import {
  Popover,
  PopoverContent,
  PopoverItem,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Download, Eye } from "lucide-react";
import { ComponentPropsWithRef } from "react";

interface DownloadPDFButtonProps extends ComponentPropsWithRef<
  typeof PopoverTrigger
> {
  pdfUrl: string;
  intent?: "outline" | "outlineInverted";
  size?: "sm" | "md";
}

export default function DownloadPDFButton(props: DownloadPDFButtonProps) {
  const { pdfUrl, className, intent = "outline", size = "md", ...rest } = props;

  const isMd = useBreakpoint("md");

  // The `download` attribute on `<a>` tags doesn't work for cross-origin resources.
  const handleDownload = async () => {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfUrl.split("/").pop() || "document.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild {...rest}>
        <IconButton
          aria-label="View or download PDF"
          intent={intent}
          size={size}
          pill
          icon={<PDFIcon />}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={isMd ? 10 : 20}
        className="me-2 md:me-0"
      >
        <div className="flex flex-col gap-1">
          <PopoverItem asChild>
            <a href={pdfUrl} rel="noopener noreferrer" target="_blank">
              <Eye className="h-4 w-4" />
              View PDF
            </a>
          </PopoverItem>
          <PopoverItem onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download PDF
          </PopoverItem>
        </div>
      </PopoverContent>
    </Popover>
  );
}
