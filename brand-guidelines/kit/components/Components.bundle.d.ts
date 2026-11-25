// Components.d.ts — the complete catalog of the 62 component(s) in
// Components.bundle.js (53 materialized from a .fig + 9 hand-authored/
// materialized: OrganizationProfileCard, Hero, ProfileHeader, Tooltip,
// ActionToolbar, SortMenu, ContextMenu, CommentInput, CommentThread).
// READ THIS FILE BEFORE USING THE BUNDLE: component
// names are derived from Figma layer names (sanitized to PascalCase,
// deduplicated) and may differ from what the design calls them — the
// "figma layer" comment above each interface maps them back.
// After the bundle <script> loads, every component is a window global
// (e.g. window.AboutV2) and usable directly in JSX.
import * as React from 'react';

// hand-authored (not from Figma): org variant of AuthorProfile.
export interface OrganizationProfileCardProps {
  className?: string;
  style?: React.CSSProperties;
  /** Org name. Default "Arcadia Science". */
  name?: string;
  /** Member-since line. Default "Member since Sep 2025". */
  since?: string;
  /** Publications count shown in the chip. Default "12". */
  publications?: string;
  /** fig-asset background class for the circular avatar. Default the Arcadia logo. */
  avatarClass?: string;
}

// hand-authored (not from Figma): reusable tinted page banner + Stacks mark.
export interface HeroProps {
  className?: string;
  style?: React.CSSProperties;
  /** Swatch token family for the band tint (maps to --<family>-brand). Default "warm-sand". Band uses the documented 110px gutter / 1220px content column. */
  tone?: "gray" | "aqua-blue" | "mint-green" | "pistachio" | "butter-yellow" | "warm-sand" | "peach" | "blush-pink" | "periwinkle" | "sky-blue";
  /** Page-specific hero content, slotted into the band. */
  children?: React.ReactNode;
}

// hand-authored (not from Figma): signed-in user's page header.
// Avatar + (name with the iD badge BESIDE it) + org + email row.
// Shared by Publications (Drafts/Released) + Settings (Account/Profile) so the
// iD badge never overlays the avatar (the old per-page markup nested it inside).
export interface ProfileHeaderProps {
  className?: string;
  style?: React.CSSProperties;
  /** User name. Default "Megan L. Hochstrasser". */
  name?: string;
  /** Org / affiliation line. Default "Arcadia Bioscience". */
  org?: string;
  /** Email shown in the mail row. Default the Megan address. */
  email?: string;
  /** fig-asset background class for the circular avatar. */
  avatarClass?: string;
}

// figma layer: "About V2" (node 1012:13238)
export interface AboutV2Props {
  className?: string;
  style?: React.CSSProperties;
}

// materialized from /Design-System/Additional-Components + components/Tooltip.
// figma node 1681:14743 "Tooltip" — dark gray-blue-900 bubble, DM Mono, down arrow.
export interface TooltipProps {
  className?: string;
  style?: React.CSSProperties;
  /** Bubble text. Default "Share". */
  label?: string;
  /** Trigger to wrap; tooltip shows on hover. Omit to render the bare bubble. */
  children?: React.ReactNode;
  /** Force the bubble visible. */
  alwaysOn?: boolean;
}

// figma node 1456:19521 "Action Toolbar" — floating dark bar: Comment·Save·Share.
export interface ActionToolbarProps {
  className?: string;
  style?: React.CSSProperties;
  /** Show leading icons (default true). */
  icons?: boolean;
  /** Active item key ('comment' | 'save' | 'share'). */
  active?: string | null;
  /** Override items: [{ key, label, tip }]. */
  items?: Array<{ key: string; label: string; tip?: string }>;
  /** Fired with the item key on click. */
  onAction?: (key: string) => void;
}

// figma node "Sort Dropdown" — trigger ("Most relevant") + popover with blue check.
export interface SortMenuProps {
  className?: string;
  style?: React.CSSProperties;
  /** Trigger label. Default "Most relevant". */
  label?: string;
  /** Options. Default ["Most Recent", "Most Commented"]. */
  options?: string[];
  /** Selected option (defaults to first). */
  selected?: string;
  /** Start open. */
  open?: boolean;
  onChange?: (opt: string) => void;
}

// figma node "Context Menu" — kebab trigger + popover (Edit / Delete).
export interface ContextMenuProps {
  className?: string;
  style?: React.CSSProperties;
  /** Menu items. Default ["Edit", "Delete"]. */
  items?: string[];
  open?: boolean;
  onSelect?: (item: string) => void;
}

// figma node "Comment Input" — collapses to one line, expands to editor toolbar.
export interface CommentInputProps {
  className?: string;
  style?: React.CSSProperties;
  /** Commenter name. Default "Jane Doe". */
  user?: string;
  /** fig-asset background class for the avatar. */
  avatarClass?: string;
  /** Placeholder. Default "Leave scientific feedback or ask a question...". */
  placeholder?: string;
  /** Start expanded (toolbar + Cancel/Submit visible). */
  expanded?: boolean;
  onSubmit?: (value: string) => void;
}

// assembled: "Responses (N)" + SortMenu + CommentInput + CommentCardList rows.
export interface CommentThreadProps {
  className?: string;
  style?: React.CSSProperties;
  /** Response count in the heading. Default 21. */
  count?: number;
  /** Comment card props to render below the composer. */
  comments?: CommentCardListProps[];
}

// figma layer: "Accordion" (node 1223:52565)
export interface AccordionProps {
  className?: string;
  style?: React.CSSProperties;
  state?: "open" | "closed";
  /** Text content; defaults to "01". */
  text1?: string;
  /** Text content; defaults to "02". */
  text2?: string;
  /** Text content; defaults to "03". */
  text3?: string;
  /** Text content; defaults to "04". */
  text4?: string;
}

// figma layer: "arrow down" (node 1218:9682)
export interface ArrowDownProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Article" (node 1405:9803)
export interface ArticleProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Author Profile" (node 1223:52586)
export interface AuthorProfileProps {
  className?: string;
  style?: React.CSSProperties;
  email?: "hidden" | "visible";
  /** Text content; defaults to "Arcadia Science". */
  text1?: string;
  /** Text content; defaults to "Member since Sep 2025". */
  text2?: string;
  /** Text content; defaults to "name@example.com". */
  text3?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon2?: React.ReactNode;
}

// figma layer: "Author Profile" (node 1012:13379)
export interface AuthorProfile2Props {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Badges" (node 1222:25077)
export interface BadgesProps {
  className?: string;
  style?: React.CSSProperties;
  size?: "28" | "20";
  /** Text content; defaults to "18". */
  text1?: string;
}

// figma layer: "Buttons" (node 1218:9725)
export interface ButtonsProps {
  className?: string;
  style?: React.CSSProperties;
  trailingIcon?: boolean;
  state?: "default" | "hover" | "focused" | "disabled";
  chooseTrailingIcon?: React.ReactNode;
  hierarchy?: "primary" | "secondary" | "ghost" | "icon only";
  chooseLeadingIcon?: React.ReactNode;
  corner?: "rounded" | "subtle";
  leadingIcon?: boolean;
  size?: "44" | "36" | "32";
  /** Text content; defaults to "Buttons". */
  text1?: string;
}

// figma layer: "Change Avatar" (node 1223:52682)
export interface ChangeAvatarProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "JPG, PNG, or GIF up to 10 MB". */
  text1?: string;
}

// figma layer: "Checkboxes" (node 1223:52475)
export interface CheckboxesProps {
  className?: string;
  style?: React.CSSProperties;
  property1?: "unchecked" | "checked" | "disabled";
}

// figma layer: "chevron down" (node 1218:9691)
export interface ChevronDownProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "chevron left" (node 1218:9696)
export interface ChevronLeftProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "chevron right" (node 1218:9680)
export interface ChevronRightProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Chips" (node 1222:383)
export interface ChipsProps {
  className?: string;
  style?: React.CSSProperties;
  /** Leading pencil/edit icon. Default FALSE (the materialized Figma default of true was overridden — chips/tags carry no edit affordance unless opted in). */
  leadingIcon?: boolean;
  property1?: "default" | "disabled";
  chooseLeadingIcon?: React.ReactNode;
  size?: "lg" | "md" | "sm";
  chooseTrailingIcon?: React.ReactNode;
  /** Trailing close/X icon. Default FALSE (materialized Figma default of true was overridden). */
  trailingIcon?: boolean;
  type?: "filled" | "outlined";
  /** Text content; defaults to "Label". */
  text1?: string;
}

// figma layer: "close" (node 1218:9674)
export interface CloseProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Code snippet" (node 1457:21394)
export interface CodeSnippetProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "Copy code". */
  text1?: string;
}

// figma layer: "Comment Card List" (node 1223:52509)
export interface CommentCardListProps {
  className?: string;
  style?: React.CSSProperties;
  state?: "selected" | "default";
  /** Text content; defaults to "Sep: 25, 2025". */
  text1?: string;
  /** Text content; defaults to "Megan L. commented: Notification beginning of message ut hendrerit text semper vel class text co aptent taciti sociosqu. As litora torquent text tacit sociosqu text see more...". */
  text2?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}

// figma layer: "Contributor Profile Card" (node 1223:52660)
export interface ContributorProfileCardProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "Ryan York". */
  text1?: string;
  /** Text content; defaults to "Editing, Supervision". */
  text2?: string;
}

// figma layer: "Create account" (node 1254:11774)
export interface CreateAccountProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Dropdown" (node 1221:354)
export interface DropdownProps {
  className?: string;
  style?: React.CSSProperties;
  property1?: "closed" | "opended";
  /** Text content; defaults to "Michael Faraday". */
  text1?: string;
  /** Text content; defaults to "My Publications". */
  text2?: string;
  /** Text content; defaults to "Profile". */
  text3?: string;
  /** Text content; defaults to "Logout". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}

// figma layer: "edit" (node 1218:9695)
export interface EditProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Footer" (node 1219:10462)
export interface FooterProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "THE\nSTACKS". */
  text1?: string;
  /** Text content; defaults to "About". */
  text2?: string;
  /** Text content; defaults to "Terms of use". */
  text3?: string;
  /** Text content; defaults to "Privacy policy". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}

// figma layer: "Header" (node 1221:368)
export interface Header3Props {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "THE\nSTACKS". */
  text1?: string;
}

// figma layer: "Homepage 5 - Minimal" (node 1587:3660)
export interface Homepage5MinimalProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "inbox" (node 1218:9688)
export interface InboxProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Input Fields" (node 1218:9554)
export interface InputFieldsProps {
  className?: string;
  style?: React.CSSProperties;
  descriptionText?: boolean;
  state?: "default" | "hover" | "active" | "focused" | "error" | "disabled";
  label?: boolean;
  size?: "sm" | "lg";
  /** Text content; defaults to "Label". */
  text1?: string;
  /** Text content; defaults to "Enter Input". */
  text2?: string;
  /** Text content; defaults to "Description Text". */
  text3?: string;
}

// figma layer: "link" (node 1254:13188)
export interface LinkProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Login and Sign up forms" (node 1456:19316)
export interface LoginAndSignUpFormsProps {
  className?: string;
  style?: React.CSSProperties;
  type?: "login" | "sign up";
  /** Text content; defaults to "Login". */
  text1?: string;
  /** Text content; defaults to "Sign up". */
  text2?: string;
  /** Text content; defaults to "Create Account". */
  text3?: string;
  /** Text content; defaults to "Enter your details to get started with The Stacks". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon2?: React.ReactNode;
}

// figma layer: "mail" (node 1218:9673)
export interface MailProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "menu" (node 1218:9678)
export interface MenuProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Message" (node 1218:9692)
export interface MessageProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "news" (node 1218:9684)
export interface NewsProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Notifications" (node 1013:14129)
export interface NotificationsProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Organization Profile" (node 1012:13626)
export interface OrganizationProfileProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Pagination" (node 1223:52103)
export interface PaginationProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "1". */
  text1?: string;
  /** Text content; defaults to "2". */
  text2?: string;
  /** Text content; defaults to "3". */
  text3?: string;
  /** Text content; defaults to "...". */
  text4?: string;
}

// figma layer: "play arrow" (node 1218:9675)
export interface PlayArrowProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Publication Card" (node 1223:52457)
export interface PublicationCardProps {
  className?: string;
  style?: React.CSSProperties;
  badge?: "hidden" | "visible";
  /** Text content; defaults to "Edited: Sep 25, 2025". */
  text1?: string;
  /** Text content; defaults to "Edit". */
  text2?: string;
  /** Text content; defaults to "A tractability atlas for experimental organism selection". */
  text3?: string;
  /** Text content; defaults to "A tractability atlas for experimental organism selection". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon2?: React.ReactNode;
}

// figma layer: "Publication card" (node 1223:52349)
export interface PublicationCard2Props {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "Feb 12". */
  text1?: string;
  /** Text content; defaults to "A tractability atlas for experimental organism selection". */
  text2?: string;
  /** Text content; defaults to "Arcadia Science". */
  text3?: string;
  /** Text content; defaults to "2". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}

// figma layer: "Publication Cards" (node 1223:52381)
export interface PublicationCardsProps {
  className?: string;
  style?: React.CSSProperties;
  badgePosition?: "left" | "right";
  /** Text content; defaults to "Feb 12". */
  text1?: string;
  /** Text content; defaults to "2". */
  text2?: string;
  /** Text content; defaults to "A tractability atlas for experimental organism selection". */
  text3?: string;
  /** Text content; defaults to "Arcadia Science". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}

// figma layer: "Publications - Drafts" (node 1014:14440)
export interface PublicationsDraftsProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Publications - Released" (node 1015:16044)
export interface PublicationsReleasedProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "search " (node 1218:9681)
export interface SearchProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Search bar" (node 1218:9704)
export interface SearchBarProps {
  className?: string;
  style?: React.CSSProperties;
  property1?: "default" | "hover";
  /** Text content; defaults to "Search publications & authors...". */
  text1?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
}

// figma layer: "settings" (node 1218:9667)
export interface SettingsProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Settings - Account" (node 1014:14504)
export interface SettingsAccountProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Settings - Profile" (node 1015:15291)
export interface SettingsProfileProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "share" (node 1218:9694)
export interface ShareProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Side Bar" (node 1457:21442)
export interface SideBarProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "Purpose". */
  text1?: string;
  /** Text content; defaults to "The strategy". */
  text2?: string;
  /** Text content; defaults to "The resource". */
  text3?: string;
  /** Text content; defaults to "Software\nAutoOpenRaman operation\nExample use case: Automated Raman spectroscopy of Chlamydomonas reinhardtii colonies". */
  text4?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon2?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon3?: React.ReactNode;
}

// figma layer: "svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjkgMTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaGVpZ2h0P" (node 1218:9679)
export interface SvgXmlBase64PHN2ZyB2aWV3Qm94PSIwIDAgMjkgProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Tabs" (node 1223:25129)
export interface TabsProps {
  className?: string;
  style?: React.CSSProperties;
  tab3?: boolean;
  property1?: "tab 3" | "tab 1" | "tab 2";
  /** Text content; defaults to "Notifications 3". */
  text1?: string;
  /** Text content; defaults to "Publications 8". */
  text2?: string;
  /** Text content; defaults to "Settings". */
  text3?: string;
  /** Swappable nested instance; defaults to the design's. */
  icon1?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon2?: React.ReactNode;
  /** Swappable nested instance; defaults to the design's. */
  icon3?: React.ReactNode;
}

// figma layer: "Terms" (node 1012:13297)
export interface TermsProps {
  className?: string;
  style?: React.CSSProperties;
}

// figma layer: "Testimonial" (node 1457:21377)
export interface TestimonialProps {
  className?: string;
  style?: React.CSSProperties;
  /** Text content; defaults to "“Our first dive into the functional annotation space was to test how reliable existing annotations are and to show that one way to deeply understand a protein family is to combine sequence, structural, and functional comparisons.”". */
  text1?: string;
}

// figma layer: "volume" (node 1218:9690)
export interface VolumeProps {
  className?: string;
  style?: React.CSSProperties;
}

declare const AboutV2: React.FC<AboutV2Props>;
declare const Accordion: React.FC<AccordionProps>;
declare const ArrowDown: React.FC<ArrowDownProps>;
declare const Article: React.FC<ArticleProps>;
declare const AuthorProfile: React.FC<AuthorProfileProps>;
declare const AuthorProfile2: React.FC<AuthorProfile2Props>;
declare const ActionToolbar: React.FC<ActionToolbarProps>;
declare const SortMenu: React.FC<SortMenuProps>;
declare const Badges: React.FC<BadgesProps>;
declare const Buttons: React.FC<ButtonsProps>;
declare const ChangeAvatar: React.FC<ChangeAvatarProps>;
declare const Checkboxes: React.FC<CheckboxesProps>;
declare const ChevronDown: React.FC<ChevronDownProps>;
declare const ChevronLeft: React.FC<ChevronLeftProps>;
declare const ChevronRight: React.FC<ChevronRightProps>;
declare const Chips: React.FC<ChipsProps>;
declare const Close: React.FC<CloseProps>;
declare const CodeSnippet: React.FC<CodeSnippetProps>;
declare const CommentCardList: React.FC<CommentCardListProps>;
declare const CommentInput: React.FC<CommentInputProps>;
declare const CommentThread: React.FC<CommentThreadProps>;
declare const ContextMenu: React.FC<ContextMenuProps>;
declare const ContributorProfileCard: React.FC<ContributorProfileCardProps>;
declare const CreateAccount: React.FC<CreateAccountProps>;
declare const Dropdown: React.FC<DropdownProps>;
declare const Edit: React.FC<EditProps>;
declare const Footer: React.FC<FooterProps>;
declare const Header3: React.FC<Header3Props>;
declare const Hero: React.FC<HeroProps>;
declare const Homepage5Minimal: React.FC<Homepage5MinimalProps>;
declare const Inbox: React.FC<InboxProps>;
declare const InputFields: React.FC<InputFieldsProps>;
declare const Link: React.FC<LinkProps>;
declare const LoginAndSignUpForms: React.FC<LoginAndSignUpFormsProps>;
declare const Mail: React.FC<MailProps>;
declare const Menu: React.FC<MenuProps>;
declare const Message: React.FC<MessageProps>;
declare const News: React.FC<NewsProps>;
declare const Notifications: React.FC<NotificationsProps>;
declare const OrganizationProfile: React.FC<OrganizationProfileProps>;
declare const OrganizationProfileCard: React.FC<OrganizationProfileCardProps>;
declare const Pagination: React.FC<PaginationProps>;
declare const ProfileHeader: React.FC<ProfileHeaderProps>;
declare const PlayArrow: React.FC<PlayArrowProps>;
declare const PublicationCard: React.FC<PublicationCardProps>;
declare const PublicationCard2: React.FC<PublicationCard2Props>;
declare const PublicationCards: React.FC<PublicationCardsProps>;
declare const PublicationsDrafts: React.FC<PublicationsDraftsProps>;
declare const PublicationsReleased: React.FC<PublicationsReleasedProps>;
declare const Search: React.FC<SearchProps>;
declare const SearchBar: React.FC<SearchBarProps>;
declare const Settings: React.FC<SettingsProps>;
declare const SettingsAccount: React.FC<SettingsAccountProps>;
declare const SettingsProfile: React.FC<SettingsProfileProps>;
declare const Share: React.FC<ShareProps>;
declare const SideBar: React.FC<SideBarProps>;
declare const SvgXmlBase64PHN2ZyB2aWV3Qm94PSIwIDAgMjkg: React.FC<SvgXmlBase64PHN2ZyB2aWV3Qm94PSIwIDAgMjkgProps>;
declare const Tabs: React.FC<TabsProps>;
declare const Terms: React.FC<TermsProps>;
declare const Tooltip: React.FC<TooltipProps>;
declare const Testimonial: React.FC<TestimonialProps>;
declare const Volume: React.FC<VolumeProps>;
declare global {
  interface Window {
    AboutV2: React.FC<AboutV2Props>;
    Accordion: React.FC<AccordionProps>;
    ArrowDown: React.FC<ArrowDownProps>;
    Article: React.FC<ArticleProps>;
    AuthorProfile: React.FC<AuthorProfileProps>;
    AuthorProfile2: React.FC<AuthorProfile2Props>;
    Badges: React.FC<BadgesProps>;
    Buttons: React.FC<ButtonsProps>;
    ChangeAvatar: React.FC<ChangeAvatarProps>;
    Checkboxes: React.FC<CheckboxesProps>;
    ChevronDown: React.FC<ChevronDownProps>;
    ChevronLeft: React.FC<ChevronLeftProps>;
    ChevronRight: React.FC<ChevronRightProps>;
    Chips: React.FC<ChipsProps>;
    Close: React.FC<CloseProps>;
    CodeSnippet: React.FC<CodeSnippetProps>;
    CommentCardList: React.FC<CommentCardListProps>;
    CommentInput: React.FC<CommentInputProps>;
    CommentThread: React.FC<CommentThreadProps>;
    ContextMenu: React.FC<ContextMenuProps>;
    ContributorProfileCard: React.FC<ContributorProfileCardProps>;
    CreateAccount: React.FC<CreateAccountProps>;
    Dropdown: React.FC<DropdownProps>;
    Edit: React.FC<EditProps>;
    Footer: React.FC<FooterProps>;
    Header3: React.FC<Header3Props>;
    Hero: React.FC<HeroProps>;
    Homepage5Minimal: React.FC<Homepage5MinimalProps>;
    Inbox: React.FC<InboxProps>;
    InputFields: React.FC<InputFieldsProps>;
    Link: React.FC<LinkProps>;
    LoginAndSignUpForms: React.FC<LoginAndSignUpFormsProps>;
    Mail: React.FC<MailProps>;
    Menu: React.FC<MenuProps>;
    Message: React.FC<MessageProps>;
    News: React.FC<NewsProps>;
    Notifications: React.FC<NotificationsProps>;
    OrganizationProfile: React.FC<OrganizationProfileProps>;
    OrganizationProfileCard: React.FC<OrganizationProfileCardProps>;
    Pagination: React.FC<PaginationProps>;
    ProfileHeader: React.FC<ProfileHeaderProps>;
    PlayArrow: React.FC<PlayArrowProps>;
    PublicationCard: React.FC<PublicationCardProps>;
    PublicationCard2: React.FC<PublicationCard2Props>;
    PublicationCards: React.FC<PublicationCardsProps>;
    PublicationsDrafts: React.FC<PublicationsDraftsProps>;
    PublicationsReleased: React.FC<PublicationsReleasedProps>;
    Search: React.FC<SearchProps>;
    SearchBar: React.FC<SearchBarProps>;
    Settings: React.FC<SettingsProps>;
    SettingsAccount: React.FC<SettingsAccountProps>;
    SettingsProfile: React.FC<SettingsProfileProps>;
    Share: React.FC<ShareProps>;
    SideBar: React.FC<SideBarProps>;
    SvgXmlBase64PHN2ZyB2aWV3Qm94PSIwIDAgMjkg: React.FC<SvgXmlBase64PHN2ZyB2aWV3Qm94PSIwIDAgMjkgProps>;
    Tabs: React.FC<TabsProps>;
    Terms: React.FC<TermsProps>;
    Tooltip: React.FC<TooltipProps>;
    ActionToolbar: React.FC<ActionToolbarProps>;
    SortMenu: React.FC<SortMenuProps>;
    Testimonial: React.FC<TestimonialProps>;
    Volume: React.FC<VolumeProps>;
  }
}
