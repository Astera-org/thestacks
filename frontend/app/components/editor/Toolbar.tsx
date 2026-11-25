import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  MoreHorizontal,
  Quote,
  Redo,
  Strikethrough,
  Undo
} from "lucide-react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  testId?: string;
  variant?: "light" | "dark";
  children: React.ReactNode;
}

function ToolbarButton(props: ToolbarButtonProps) {
  const {
    onClick,
    isActive,
    disabled,
    tooltip,
    testId,
    variant = "light",
    children
  } = props;
  const isDark = variant === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tooltip}
          onClick={onClick}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "h-8 w-8",
            isDark
              ? "hover:text-info-800 text-fg-inverted disabled:text-fg-inverted/40 hover:bg-white/15 focus:bg-white/15"
              : "hover:text-fg hover:bg-gray-700 focus:bg-gray-700",
            isActive && (isDark ? "bg-white/20" : "bg-gray-700")
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function useToolbarState() {
  const { editor } = useCurrentEditor();

  const editorState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isStrike: e?.isActive("strike") ?? false,
      isCode: e?.isActive("code") ?? false,
      isLink: e?.isActive("link") ?? false,
      isBlockquote: e?.isActive("blockquote") ?? false,
      isBulletList: e?.isActive("bulletList") ?? false,
      isOrderedList: e?.isActive("orderedList") ?? false
    })
  }) ?? {
    canUndo: false,
    canRedo: false,
    isBold: false,
    isItalic: false,
    isStrike: false,
    isCode: false,
    isLink: false,
    isBlockquote: false,
    isBulletList: false,
    isOrderedList: false
  };

  return { editor, editorState };
}

/**
 * Overflow items shown inside the compact toolbar's "more" popover.
 * Wrapped in its own TooltipProvider because PopoverContent renders
 * in a portal outside the parent provider.
 */
function ToolbarOverflowContent(props: {
  onLinkClick?: () => void;
  onImageClick?: () => void;
}) {
  const { onLinkClick, onImageClick } = props;
  const { editor, editorState } = useToolbarState();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editorState.canUndo}
          tooltip="Undo"
          variant="dark"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editorState.canRedo}
          tooltip="Redo"
          variant="dark"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6 bg-white/25" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editorState.isStrike}
          disabled={!editor}
          tooltip="Strikethrough"
          variant="dark"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCode().run()}
          isActive={editorState.isCode}
          disabled={!editor}
          tooltip="Code"
          variant="dark"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6 bg-white/25" />
        <ToolbarButton
          onClick={() => onLinkClick?.()}
          isActive={editorState.isLink}
          disabled={!editor}
          tooltip="Link"
          variant="dark"
        >
          <Link className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => onImageClick?.()}
          disabled={!editor}
          tooltip="Image"
          variant="dark"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editorState.isBlockquote}
          disabled={!editor}
          tooltip="Quote"
          variant="dark"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-6 bg-white/25" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editorState.isBulletList}
          disabled={!editor}
          tooltip="Bullet List"
          variant="dark"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editorState.isOrderedList}
          disabled={!editor}
          tooltip="Numbered List"
          variant="dark"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

interface ToolbarProps {
  compact?: boolean;
  onLinkClick?: () => void;
  onImageClick?: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const { compact = false, onLinkClick, onImageClick } = props;
  const { editor, editorState } = useToolbarState();

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editorState.isBold}
          disabled={!editor}
          tooltip="Bold"
          testId="toolbar-bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editorState.isItalic}
          disabled={!editor}
          tooltip="Italic"
          testId="toolbar-italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="More formatting"
              onMouseDown={(e) => e.preventDefault()}
              className="hover:text-fg h-8 w-8 hover:bg-gray-700 focus:bg-gray-700"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="bg-carbon-700 z-201 w-auto min-w-0 rounded-lg border-none p-1 shadow-lg"
            align="start"
            side="top"
            sideOffset={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <ToolbarOverflowContent
              onLinkClick={onLinkClick}
              onImageClick={onImageClick}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-1">
      <ToolbarButton
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!editorState.canUndo}
        tooltip="Undo"
        testId="toolbar-undo"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!editorState.canRedo}
        tooltip="Redo"
        testId="toolbar-redo"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        isActive={editorState.isBold}
        disabled={!editor}
        tooltip="Bold"
        testId="toolbar-bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        isActive={editorState.isItalic}
        disabled={!editor}
        tooltip="Italic"
        testId="toolbar-italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        isActive={editorState.isStrike}
        disabled={!editor}
        tooltip="Strikethrough"
        testId="toolbar-strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleCode().run()}
        isActive={editorState.isCode}
        disabled={!editor}
        tooltip="Code"
        testId="toolbar-code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton
        onClick={() => onLinkClick?.()}
        isActive={editorState.isLink}
        disabled={!editor}
        tooltip="Link"
        testId="toolbar-link"
      >
        <Link className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => onImageClick?.()}
        disabled={!editor}
        tooltip="Image"
        testId="toolbar-image"
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        isActive={editorState.isBlockquote}
        disabled={!editor}
        tooltip="Quote"
        testId="toolbar-quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        isActive={editorState.isBulletList}
        disabled={!editor}
        tooltip="Bullet List"
        testId="toolbar-bullet-list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        isActive={editorState.isOrderedList}
        disabled={!editor}
        tooltip="Numbered List"
        testId="toolbar-ordered-list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
