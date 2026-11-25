import { Button } from "@/components/ui/button";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating
} from "@floating-ui/react-dom";
import { useCurrentEditor } from "@tiptap/react";
import { Pencil, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LinkBubbleMenuProps {
  onEditLink: (url: string) => void;
}

export function LinkBubbleMenu(props: LinkBubbleMenuProps) {
  const { onEditLink } = props;
  const { editor } = useCurrentEditor();
  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(
    null
  );
  const isMenuHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  });

  // Set the reference element when a link is hovered.
  useEffect(() => {
    if (hoveredLink) {
      refs.setReference(hoveredLink);
    }
  }, [hoveredLink, refs]);

  // Cancel any pending hide timeout.
  const cancelHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Schedule hiding the menu after a delay, giving the user time to reach it.
  const scheduleHide = useCallback(() => {
    cancelHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isMenuHoveredRef.current) {
        setHoveredLink(null);
      }
    }, 300);
  }, [cancelHideTimeout]);

  // Clean up timeout on unmount.
  useEffect(() => {
    return () => cancelHideTimeout();
  }, [cancelHideTimeout]);

  // Listen for mouse events on links within the editor.
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkElement = target.closest("a");
      if (linkElement && editorElement.contains(linkElement)) {
        cancelHideTimeout();
        setHoveredLink(linkElement as HTMLAnchorElement);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      const linkElement = target.closest("a");

      // Only schedule hide if we're leaving a link and not entering the menu.
      if (linkElement && !relatedTarget?.closest("[data-link-menu]")) {
        scheduleHide();
      }
    };

    editorElement.addEventListener("mouseover", handleMouseOver);
    editorElement.addEventListener("mouseout", handleMouseOut);

    return () => {
      editorElement.removeEventListener("mouseover", handleMouseOver);
      editorElement.removeEventListener("mouseout", handleMouseOut);
    };
  }, [editor, cancelHideTimeout, scheduleHide]);

  const handleEdit = useCallback(() => {
    if (!hoveredLink) return;
    const href = hoveredLink.getAttribute("href") ?? "";
    onEditLink(href);
    setHoveredLink(null);
  }, [hoveredLink, onEditLink]);

  const handleRemove = useCallback(() => {
    if (!editor || !hoveredLink) return;
    // Find the position of the link in the editor
    const href = hoveredLink.getAttribute("href");
    if (href) {
      // Select the link and remove it
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setHoveredLink(null);
  }, [editor, hoveredLink]);

  const handleMenuMouseEnter = useCallback(() => {
    isMenuHoveredRef.current = true;
    cancelHideTimeout();
  }, [cancelHideTimeout]);

  const handleMenuMouseLeave = useCallback(() => {
    isMenuHoveredRef.current = false;
    setHoveredLink(null);
  }, []);

  if (!editor || !hoveredLink) return null;

  return (
    <div
      ref={(node) => refs.setFloating(node)}
      style={floatingStyles}
      data-link-menu
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
      className="text-fg bg-surface z-50 flex items-center gap-1 rounded-md border p-1 shadow-md"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleEdit}
        className="hover:bg-periwinkle-900/25 hover:text-fg h-8 gap-2 px-2 text-xs"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        className="hover:bg-periwinkle-900/25 hover:text-fg h-8 gap-2 px-2 text-xs"
      >
        <Unlink className="h-4 w-4" />
        Remove
      </Button>
    </div>
  );
}
