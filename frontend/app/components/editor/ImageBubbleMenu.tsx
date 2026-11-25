import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating
} from "@floating-ui/react-dom";
import type { Editor } from "@tiptap/react";
import { useCurrentEditor } from "@tiptap/react";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Find the ProseMirror document position of an image node whose DOM element
 * matches the given HTMLImageElement. Returns null if not found.
 */
function findImagePos(
  editor: Editor,
  imageElement: HTMLImageElement
): number | null {
  const { doc } = editor.view.state;
  let pos: number | null = null;
  doc.descendants((node, nodePos) => {
    if (node.type.name === "image" && pos === null) {
      const domNode = editor.view.nodeDOM(nodePos);
      if (domNode === imageElement || domNode?.contains(imageElement)) {
        pos = nodePos;
        return false;
      }
    }
    return true;
  });
  return pos;
}

type ImageSize = "small" | "medium" | "large";

const IMAGE_SIZES: { label: string; value: ImageSize; width: string }[] = [
  { label: "S", value: "small", width: "25%" },
  { label: "M", value: "medium", width: "50%" },
  { label: "L", value: "large", width: "75%" }
];

interface ImageBubbleMenuProps {
  onEditImage: (altText: string) => void;
}

export function ImageBubbleMenu(props: ImageBubbleMenuProps) {
  const { onEditImage } = props;
  const { editor } = useCurrentEditor();
  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(
    null
  );
  const isMenuHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "top-end",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  });

  // Set the reference element when an image is hovered.
  useEffect(() => {
    if (hoveredImage) {
      refs.setReference(hoveredImage);
    }
  }, [hoveredImage, refs]);

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
        setHoveredImage(null);
      }
    }, 300);
  }, [cancelHideTimeout]);

  // Clean up timeout on unmount.
  useEffect(() => {
    return () => cancelHideTimeout();
  }, [cancelHideTimeout]);

  // Listen for mouse events on images within the editor.
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && editorElement.contains(target)) {
        cancelHideTimeout();
        setHoveredImage(target as HTMLImageElement);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;

      // Only schedule hide if we're leaving an image and not entering the menu.
      if (
        target.tagName === "IMG" &&
        !relatedTarget?.closest("[data-image-menu]")
      ) {
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
    if (!editor || !hoveredImage) return;

    // Select the image node so that the modal's updateAttributes targets it.
    const imagePos = findImagePos(editor, hoveredImage);
    if (imagePos !== null) {
      editor.commands.setNodeSelection(imagePos);
    }

    const alt = hoveredImage.getAttribute("alt") ?? "";
    onEditImage(alt);
    setHoveredImage(null);
  }, [editor, hoveredImage, onEditImage]);

  const handleDelete = useCallback(() => {
    if (!editor || !hoveredImage) return;

    const imagePos = findImagePos(editor, hoveredImage);
    if (imagePos !== null) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: imagePos, to: imagePos + 1 })
        .run();
    }

    setHoveredImage(null);
  }, [editor, hoveredImage]);

  const handleSetSize = useCallback(
    (size: ImageSize) => {
      if (!editor || !hoveredImage) return;

      const imagePos = findImagePos(editor, hoveredImage);
      if (imagePos !== null) {
        editor
          .chain()
          .focus()
          .setNodeSelection(imagePos)
          .updateAttributes("image", { size })
          .run();
        // Update the DOM attribute immediately for visual feedback.
        hoveredImage.setAttribute("data-size", size);
      }
    },
    [editor, hoveredImage]
  );

  const currentSize: ImageSize =
    (hoveredImage?.getAttribute("data-size") as ImageSize) || "medium";

  const handleMenuMouseEnter = useCallback(() => {
    isMenuHoveredRef.current = true;
    cancelHideTimeout();
  }, [cancelHideTimeout]);

  const handleMenuMouseLeave = useCallback(() => {
    isMenuHoveredRef.current = false;
    setHoveredImage(null);
  }, []);

  if (!editor || !hoveredImage) return null;

  return (
    <div
      ref={(node) => refs.setFloating(node)}
      style={floatingStyles}
      data-image-menu
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
      className="text-fg bg-surface z-50 flex items-center gap-1 rounded-md border p-1 shadow-md"
    >
      {/* Size buttons. */}
      <div className="flex items-center gap-1 border-r pr-1">
        {IMAGE_SIZES.map(({ label, value, width }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            onClick={() => handleSetSize(value)}
            className={cn(
              "hover:bg-periwinkle-900/25 text-fg h-8 w-8 px-0 text-xs font-medium",
              currentSize === value ? "bg-periwinkle-900/25" : "bg-transparent"
            )}
            title={`${label === "S" ? "Small" : label === "M" ? "Medium" : "Large"} (${width})`}
          >
            {label}
          </Button>
        ))}
      </div>
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
        onClick={handleDelete}
        className="hover:bg-periwinkle-900/25 hover:text-fg h-8 gap-2 px-2 text-xs"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  );
}
