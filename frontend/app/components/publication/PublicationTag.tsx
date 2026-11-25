import Link from "@/components/Link";
import Chip from "@/components/stacks-ui/Chip";
import { cn, toSentenceCase } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { MouseEventHandler } from "react";

const publicationTagVariants = cva("", {
  variants: {
    variant: {
      header: "hover:bg-sky-blue-500 cursor-pointer",
      card: "bg-warm-sand-400 hover:bg-warm-sand-500 relative z-10 cursor-pointer",
      list: "h-7 px-3 bg-carbon-100"
    }
  }
});

type PublicationTagVariant = NonNullable<
  VariantProps<typeof publicationTagVariants>["variant"]
>;

interface PublicationTagProps {
  tag: string;
  variant: PublicationTagVariant;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function PublicationTag(props: PublicationTagProps) {
  const { tag, variant, className, onClick } = props;

  if (variant === "list") {
    return (
      <Chip className={cn(publicationTagVariants({ variant }), className)}>
        {toSentenceCase(tag)}
      </Chip>
    );
  }

  return (
    <Chip
      asChild
      className={cn(publicationTagVariants({ variant }), className)}
    >
      <Link to={`/?search=tag:${encodeURIComponent(tag)}`} onClick={onClick}>
        {toSentenceCase(tag)}
      </Link>
    </Chip>
  );
}
