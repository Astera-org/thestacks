import Link from "@/components/Link";
import Avatar from "@/components/stacks-ui/Avatar";
import { cn } from "@/lib/utils";
import type { Organization } from "@/types";

interface OrganizationBadgeProps {
  organization: Partial<Organization>;
  className?: string;
}

export default function OrganizationBadge(props: OrganizationBadgeProps) {
  const { organization, className } = props;

  if (!organization.slug || !organization.name) return null;

  return (
    <Link
      to={`/organizations/${organization.slug}`}
      className={cn("group flex items-center gap-3 font-mono", className)}
    >
      <span className="text-caption-50 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
        {organization.name}
      </span>
      <Avatar src={organization.avatar} alt={organization.name} />
    </Link>
  );
}
