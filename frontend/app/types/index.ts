import type { MediaAsset } from "@thestacks/myst-renderer";
export type { MediaAsset };

export type ISODateString = string;

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
}

export interface Organization {
  slug: string;
  id: number;
  name: string;
  avatar?: string | null;
  profile?: string | null;
  ror_id: string | null;
  unlisted?: boolean;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  orcid: string | null;
  first_name: string;
  last_name: string;
  avatar: string | null;
  profile: string | null;
  points: number;
  moderator: boolean;
  admin: boolean;
  state: string;
  created_at: string;
  login_at: string | null;
  organization?: Organization;
  can_create_publications?: boolean;
  can_contact_us?: boolean;
}

export interface LimitedUser {
  id: number;
  username: string;
  email?: string;
  orcid: string | null;
  first_name: string;
  last_name: string;
  avatar: string | null;
  profile?: string | null;
  points?: number;
  moderator?: boolean;
  admin?: boolean;
  state?: string;
  created_at?: string;
  icon_color?: string;
}

export interface Contributor {
  user_id: number;
  avatar?: string;
  first_name: string;
  last_name: string;
  priority: number | null;
  orcid?: string | null;
  username: string;
  icon_color?: string;
  roles: string[];
  // The v0 publication endpoints return one row per contributor-role pair with
  // a single `role` instead of `roles`.
  role?: string;
  in_byline: boolean;
  affiliations?: ContributorAffiliation[];
}

export interface ContributorAffiliation {
  org_id: number;
  name: string;
  slug: string;
  ror_id: string | null;
  avatar?: string | null;
}

export interface OrgOnPub {
  slug: string;
  org_id: number;
  name: string;
  avatar?: string | null;
  priority?: number | null;
}

export interface ContributorWithRoles extends Contributor {
  roles: string[];
  affiliations: ContributorAffiliation[];
}

export type Reference = {
  text: string;
  url: string;
};

export type PublicationState = "DRAFT" | "PUBLISHED" | "RETRACTED" | "DELETED";

// UI order matches below order
export enum LinkedAssetType {
  Code = "Code",
  Data = "Data",
  CodeAndData = "Code + data",
  Material = "Material",
  Protocol = "Protocol",
  ThreeDPrinting = "3D printing design",
  CompanionPub = "Companion pub",
  Other = "Other"
}

export const LINKED_ASSET_TYPES: LinkedAssetType[] =
  Object.values(LinkedAssetType);

export interface LinkedAsset {
  type: LinkedAssetType;
  url: string;
  name?: string;
}

export interface Publication {
  id: number;
  slug: string;
  parent_id: number | null;
  template_id: number | null;
  latest_version_id: number | null;
  title: string;
  subtitle: string | null;
  abstract: string;
  doi: string | null;
  version_doi: string | null;
  publisher: string | null;
  body: string;
  version_desc: string | null;
  version_number: number;
  version_id: number;
  state: PublicationState;
  license: string;
  created_at: string;
  updated_at: string | null;
  contributors: Contributor[];
  references: Reference[];
  pdf_url: string | null;
  num_comments?: number;
  social_posts_count?: number | null;
  feedback_form_embed_src?: string | null;
  social_posts_embed_src?: string | null;
  tags?: string[];
  linked_assets?: LinkedAsset[];
  orgs?: OrgOnPub[];
  // TODO: Why is this optional?
  versions?: VersionInfo[];
  importDocument?: ImportDocument | null;
  mediaAssets: MediaAsset[];
  /** The ULID, for addressing the publication in the v1 API. */
  publication_ulid: string;
  /** The format the content is rendered in; absent when it has none recorded. */
  content?: PublicationContent | null;
}

/**
 * The format a version's content is rendered in. `format: "myst"` marks
 * publications rendered from Raven's MyST AST (see `app/lib/mystmd`).
 */
export interface PublicationContent {
  format: string;
}

export interface ImportDocument {
  body: string;
  url: string;
  format: string;
  syncDate: string;
  filename?: string | null;
}
export interface UserPermissionsOnPublication {
  can_edit?: boolean;
  user_is_comments_admin?: boolean; // Can delete any comment
}

export interface Comment {
  comment_id: number;
  // TODO: this is not actually returned by the backend
  publication_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  // TODO: Why is this optional?
  username?: string | null;
  parent_id: number | null;
  avatar?: string | null;
  body: string;
  anchor_text?: string | null;
  pre_text?: string | null;
  post_text?: string | null;
  created_at: string;
  updated_at: string | null;
  viewer_rating?: number | null;
  replies?: Comment[];
  version_id: number | null;
  state?: string;
}

export interface CommentThread {
  root: Comment;
  replies: Comment[];
}

/**
 * Shape returned by GET /publications/my/drafts
 */
export interface DraftSummary {
  publication_id: number;
  publication_id_str: string;
  slug: string;
  version_id: number;
  version_number: number;
  title: string | null;
  created_at: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface PaginatedPublications {
  pagination: Pagination;
  items: Publication[];
}

export interface PaginatedDrafts {
  pagination: Pagination;
  items: DraftSummary[];
}

export interface PaginatedComments {
  pagination: Pagination;
  items: Comment[];
}

export interface PaginatedUsers {
  pagination: Pagination;
  items: User[];
}

export interface Notification {
  id: number;
  user_id: number;
  publication_id: number;
  publication_slug: string;
  publication_title?: string | null;
  comment_id?: number;
  comment_author?: {
    first_name: string;
    last_name: string;
    avatar: string | null;
  } | null;
  comment_text_excerpt?: string | null;
  comment_state?: "PUBLISHED" | "MODERATED" | "DELETED" | "WITHDRAWN" | null;
  publication_org?: {
    id: number;
    avatar: string | null;
  } | null;
  state: string;
  message: string;
  // 0 = unread, 1 = read.
  // TODO: Why is this a number? Change this to a boolean.
  seen: number;
  created_at: string;
}

export interface PaginatedNotifications {
  pagination: Pagination;
  items: Notification[];
}

export interface VersionInfo {
  id: number;
  version_number?: number;
  doi?: string | null;
  created_at: string;
  version_desc?: string;
}

export interface Heading {
  depth: number;
  hasChildren: boolean;
  id: string;
  text: string;
}
