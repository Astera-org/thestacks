import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useEffect, useRef, type ComponentProps } from "react";

/**
 * Accessible tabs built on Radix UI (`@radix-ui/react-tabs`): roving focus,
 * arrow-key navigation, and the correct tablist/tab/tabpanel roles are handled
 * for us. Styling is shared with the auth card.
 *
 * Compose the parts: `Tabs` (root) > `TabsList` > `TabsTrigger`, with a
 * `TabsContent` per panel. Triggers can hold an icon and/or count alongside the
 * label; the auth card uses plain text labels.
 */
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  children,
  className,
  ref,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = useRef<HTMLDivElement>(null);

  // Positions one shared indicator under the active tab so it can slide
  // between tabs. Imperative, like ScrollMask: measuring never re-renders.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const update = () => {
      list.style.setProperty("--tab-track-width", `${list.scrollWidth}px`);

      const active = list.querySelector<HTMLElement>(
        '[role="tab"][data-state="active"]'
      );
      if (!active) return;

      list.style.setProperty("--tab-indicator-x", `${active.offsetLeft}px`);
      list.style.setProperty(
        "--tab-indicator-width",
        `${active.offsetWidth}px`
      );

      // Place it once without motion, then let later changes slide.
      if (!list.dataset.indicator) {
        list.dataset.indicator = "placed";
        requestAnimationFrame(() => {
          list.dataset.indicator = "ready";
        });
      }
    };

    // Any tab resizing (a count loading in) shifts the ones after it.
    const resizeObserver = new ResizeObserver(update);
    const observeTabs = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(list);
      list
        .querySelectorAll('[role="tab"]')
        .forEach((tab) => resizeObserver.observe(tab));
    };

    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList")) observeTabs();
      update();
    });
    mutationObserver.observe(list, {
      attributeFilter: ["data-state"],
      childList: true,
      subtree: true
    });

    observeTabs();
    update();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      className={cn("group/tabs relative flex w-full", className)}
      {...props}
    >
      {children}
      {/* The track lives inside the scroller, not as its border, so the
          indicator can cover it without overflowing the clip edge. */}
      <span
        aria-hidden
        className="bg-border-strong pointer-events-none absolute bottom-0 left-0 h-px w-full min-w-(--tab-track-width)"
      />
      <span
        aria-hidden
        className="bg-carbon-900 pointer-events-none absolute bottom-0 left-0 h-0.5 w-(--tab-indicator-width) translate-x-(--tab-indicator-x) opacity-0 ease-in-out group-data-indicator/tabs:opacity-100 group-data-[indicator=ready]/tabs:transition-[translate,width] group-data-[indicator=ready]/tabs:duration-300 motion-reduce:transition-none"
      />
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // `after` is the active bar until TabsList has measured and its shared,
        // sliding indicator takes over (and on the server).
        "text-caption-50 data-[state=active]:text-fg-strong data-[state=inactive]:text-gray-blue-500 data-[state=inactive]:hover:text-gray-blue-800 data-[state=active]:after:bg-carbon-900 relative flex h-14 items-center gap-2 font-mono whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:z-1 after:h-0.5 after:bg-transparent after:transition-colors group-data-indicator/tabs:after:hidden md:h-16 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus:outline-none", className)}
      {...props}
    />
  );
}
