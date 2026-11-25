import { CreativeCommonsIcon } from "@/components/icons";
import { ComponentType, SVGProps } from "react";

export interface LicenseInfo {
  /** Full display name including version, e.g. "CC BY 4.0". */
  name: string;
  /** Canonical URL for the license deed. */
  link: string;
  /** Icon to render alongside the name. */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Registry of supported licenses, keyed by the code stored on a publication.
 * To support a new license (CC or otherwise), add an entry here with its own
 * name, link and icon. Nothing else needs to change.
 */
const licenses: Record<string, LicenseInfo> = {
  "CC BY": {
    name: "CC BY 4.0",
    link: "https://creativecommons.org/licenses/by/4.0/",
    icon: (props) => <CreativeCommonsIcon glyphs={["cc", "by"]} {...props} />
  },
  CC0: {
    name: "CC0 1.0",
    link: "https://creativecommons.org/publicdomain/zero/1.0/",
    icon: (props) => <CreativeCommonsIcon glyphs={["cc", "zero"]} {...props} />
  }
};

export function getLicense(
  license: string | null | undefined
): LicenseInfo | null {
  if (!license) return null;
  return licenses[license] ?? null;
}

export function licenseToLink(
  license: string | null | undefined
): string | null {
  return getLicense(license)?.link ?? null;
}

export function licenseToDisplayName(
  license: string | null | undefined
): string | null {
  if (!license) return null;
  return getLicense(license)?.name ?? license;
}
