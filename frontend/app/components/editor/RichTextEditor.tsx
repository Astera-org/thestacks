import { getPresignedUploadUrl, uploadToS3 } from "@/api/comments";
import { ImageBubbleMenu } from "@/components/editor/ImageBubbleMenu";
import { ImageModal } from "@/components/editor/ImageModal";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { LinkModal } from "@/components/editor/LinkModal";
import { Toolbar } from "@/components/editor/Toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import BaseImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  EditorContext,
  useEditor,
  type Editor
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Custom Image extension that adds a `size` attribute to control image width.
 * The size is stored as a `data-size` attribute on the <img> element and styled
 * via CSS in comments.css (small = 25%, medium = 50%, large = 75%).
 *
 * For Markdown round-tripping, the size is encoded in the alt text as a
 * trailing `{small}` or `{large}` marker (medium is the default and omitted).
 * Example: `![photo of a cat{small}](https://example.com/cat.png)`
 */
const SIZE_RE = /\{(small|medium|large)\}$/;

/** Escape `]` in Markdown image alt text so it doesn't break `![...]()`. */
function escapeAlt(text: string): string {
  return text.replace(/\]/g, "\\]");
}

/** Escape `)` and `"` in Markdown image URLs/titles so they don't break `![]()`. */
function escapeSrc(text: string): string {
  return text.replace(/[)"]/g, (ch) => `\\${ch}`);
}

const Image = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: "medium",
        parseHTML: (element) => element.getAttribute("data-size") || "medium",
        renderHTML: (attributes) => ({
          "data-size": attributes.size
        })
      }
    };
  },

  // Serialize the image node to Markdown, encoding size in the alt text.
  renderMarkdown(node) {
    const src = node.attrs?.src ?? "";
    const alt = node.attrs?.alt ?? "";
    const title = node.attrs?.title ?? "";
    const size = node.attrs?.size ?? "medium";

    // Only encode size when it differs from the default.
    const altWithSize = size !== "medium" ? `${alt}{${size}}` : alt;

    if (title) {
      return `![${escapeAlt(altWithSize)}](${escapeSrc(src)} "${title.replace(/"/g, '\\"')}")`;
    }
    return `![${escapeAlt(altWithSize)}](${escapeSrc(src)})`;
  },

  // Parse an image token from Markdown, extracting size from the alt text.
  parseMarkdown(token, helpers) {
    const rawAlt = (token as Record<string, string>).text ?? "";
    const sizeMatch = rawAlt.match(SIZE_RE);
    const size = sizeMatch ? sizeMatch[1] : "medium";
    const alt = sizeMatch ? rawAlt.replace(SIZE_RE, "").trim() : rawAlt;

    return helpers.createNode("image", {
      src: (token as Record<string, string>).href ?? "",
      alt,
      title: (token as Record<string, string>).title ?? null,
      size
    });
  }
});

/**
 * Extract the publication slug from the current URL.
 * Expected URL pattern: /publications/{slug}/...
 */
function getSlugFromUrl(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/publications\/([^/]+)/);
  return match ? match[1] : null;
}

// The Markdown extension adds getMarkdown() to the editor instance.
// This type extends the base Editor type to include that method.
type MarkdownEditor = Editor & { getMarkdown: () => string };

interface RichTextEditorProps {
  actions?: React.ReactNode;
  autoFocus?: boolean;
  className?: string;
  collapsed?: boolean;
  compactToolbar?: boolean;
  disabled?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  showToolbar?: boolean;
  value?: string;
}

export default function RichTextEditor(props: RichTextEditorProps) {
  const {
    actions,
    autoFocus = false,
    className,
    collapsed = false,
    compactToolbar = false,
    disabled = false,
    name,
    onChange,
    onFocus,
    placeholder = "Write something...",
    showToolbar = true,
    value = ""
  } = props;

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkUrl, setEditingLinkUrl] = useState("");

  // State for image modal.
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [editingImageAlt, setEditingImageAlt] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);

  // Track whether the editor is empty for custom placeholder rendering
  // (bypasses Tiptap's Placeholder extension which doesn't reliably show
  // the placeholder in all focus states).
  const [isEmpty, setIsEmpty] = useState(!value);

  const editor = useEditor({
    // Configures bidirectional conversion between Markdown and Tiptap's JSON format.
    // See: https://tiptap.dev/docs/editor/markdown.
    contentType: "markdown",
    // Register extensions.
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Markdown,
      Link.configure({
        openOnClick: false
      }),
      Image.configure({
        inline: false,
        allowBase64: false
      })
    ],
    content: value,
    editable: !disabled,
    autofocus: autoFocus ? "all" : false,
    // Disable immediate rendering to prevent SSR issues.
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
    },
    onUpdate: ({ editor }) => {
      // Update empty state for placeholder.
      setIsEmpty(editor.isEmpty);
      // Serialize editor content to Markdown using the Markdown extension.
      // See: https://tiptap.dev/docs/editor/markdown
      onChange?.((editor as MarkdownEditor).getMarkdown());
    }
  });

  // Sync external value changes.
  // Note: setContent triggers onUpdate which updates isEmpty state.
  useEffect(() => {
    if (editor && value !== (editor as MarkdownEditor).getMarkdown()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Sync disabled state.
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const providerValue = useMemo(() => ({ editor }), [editor]);

  // Handle opening the link modal from the toolbar.
  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    // Get existing link URL if cursor is on a link.
    const existingUrl = editor.getAttributes("link").href ?? "";
    setEditingLinkUrl(existingUrl);
    setLinkModalOpen(true);
  }, [editor]);

  // Handle opening the link modal from the bubble menu (edit).
  const handleEditLink = useCallback((url: string) => {
    setEditingLinkUrl(url);
    setLinkModalOpen(true);
  }, []);

  // Handle saving a link from the modal.
  const handleSaveLink = useCallback(
    (url: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    },
    [editor]
  );

  // Handle opening the image modal from the toolbar.
  const handleImageClick = useCallback(() => {
    setEditingImageAlt("");
    setIsEditingImage(false);
    setImageModalOpen(true);
  }, []);

  // Handle opening the image modal from the bubble menu (edit alt text).
  const handleEditImage = useCallback((altText: string) => {
    setEditingImageAlt(altText);
    setIsEditingImage(true);
    setImageModalOpen(true);
  }, []);

  // Handle saving an image from the modal.
  const handleSaveImage = useCallback(
    async (file: File | null, altText: string, imageUrl?: string) => {
      if (!editor) return;

      // Update the currently selected image's alt text.
      if (isEditingImage) {
        editor
          .chain()
          .focus()
          .updateAttributes("image", { alt: altText })
          .run();
        return;
      }

      // Insert image from URL directly (no upload needed).
      if (imageUrl) {
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(imageUrl.trim());
        } catch {
          throw new Error("Invalid image URL");
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          throw new Error("Only http and https image URLs are supported");
        }

        editor
          .chain()
          .focus()
          .setImage({ src: parsedUrl.toString(), alt: altText })
          .run();
        return;
      }

      // New image upload.
      if (!file) {
        throw new Error("No file selected");
      }

      const slug = getSlugFromUrl();
      if (!slug) {
        throw new Error("Could not determine publication slug from URL");
      }

      // Get presigned URL from backend.
      const { upload_url, public_url } = await getPresignedUploadUrl(
        slug,
        file.type,
        file.size
      );

      // Upload to S3.
      await uploadToS3(upload_url, file);

      // Insert image into editor.
      editor.chain().focus().setImage({ src: public_url, alt: altText }).run();
    },
    [editor, isEditingImage]
  );

  return (
    <EditorContext.Provider value={providerValue}>
      <TooltipProvider delayDuration={300}>
        <div className={cn("bg-surface rounded-xl border", className)}>
          <input type="hidden" name={name} value={value} />
          <div className="comment-body relative" onClick={onFocus}>
            <EditorContent
              editor={editor}
              className={cn(
                "max-w-none p-4",
                collapsed
                  ? "md:[&_.ProseMirror]:min-h-9"
                  : "[&_.ProseMirror]:min-h-40"
              )}
            />
            {isEmpty && (
              <p
                className="text-fg-muted pointer-events-none absolute top-3 left-4 md:top-4 md:left-4"
                aria-hidden="true"
              >
                {placeholder}
              </p>
            )}
          </div>
          {showToolbar && (
            <div className="flex items-center justify-between px-2 pb-2">
              <Toolbar
                compact={compactToolbar}
                onLinkClick={handleLinkClick}
                onImageClick={handleImageClick}
              />
              {actions && (
                <div className="flex items-center gap-3">{actions}</div>
              )}
            </div>
          )}
          <LinkBubbleMenu onEditLink={handleEditLink} />
          <ImageBubbleMenu onEditImage={handleEditImage} />
        </div>
        <LinkModal
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          initialUrl={editingLinkUrl}
          onSave={handleSaveLink}
        />
        <ImageModal
          open={imageModalOpen}
          onOpenChange={setImageModalOpen}
          initialAltText={editingImageAlt}
          isEditing={isEditingImage}
          onSave={handleSaveImage}
        />
      </TooltipProvider>
    </EditorContext.Provider>
  );
}
