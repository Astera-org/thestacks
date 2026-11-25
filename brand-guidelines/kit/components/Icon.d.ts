import * as React from 'react';

/** Every icon name available in the Stacks icon set. */
export type IconName =
  | "search"
  | "bell"
  | "menu"
  | "close"
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "more-horizontal"
  | "more-vertical"
  | "external-link"
  | "grid"
  | "list"
  | "columns"
  | "plus"
  | "check"
  | "copy"
  | "edit"
  | "trash"
  | "share"
  | "bookmark"
  | "download"
  | "upload"
  | "link"
  | "settings"
  | "filter"
  | "sort"
  | "refresh"
  | "send"
  | "comment"
  | "heart"
  | "eye"
  | "quote"
  | "book"
  | "document"
  | "tag"
  | "calendar"
  | "clock"
  | "star"
  | "info"
  | "alert-triangle"
  | "check-circle"
  | "x-circle"
  | "help-circle"
  | "user"
  | "users"
  | "mail"
  | "github"
  | "twitter"
  | "linkedin"
  | "rss";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name' | 'color'> {
  /** Icon name from the Stacks set. */
  name: IconName;
  /** Width & height in px (square). Default 24. */
  size?: number;
  /** Stroke width. Default 1.75 (matches the Figma 1.6–2 range). */
  strokeWidth?: number;
  /** Stroke color. Default 'currentColor' so the icon inherits text color. */
  color?: string;
  /** Accessible label; when set the icon becomes role="img", otherwise aria-hidden. */
  title?: string;
}

/** Inline-SVG icon, faithful to the canonical /Design-System/Icon-set frame. */
export declare function Icon(props: IconProps): React.ReactElement | null;

/** Flat list of all 55 icon names. */
export declare const ICON_NAMES: IconName[];
