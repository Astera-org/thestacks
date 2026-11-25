import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/stacks-ui/Tabs";
import type { GenericNode } from "myst-common";
import { MyST } from "myst-to-react";

/** `{tab-set}` with the site's own tabs (Radix: roles and arrow keys). */
function TabSet({ node }: { node: GenericNode }) {
  const items: GenericNode[] = (node.children ?? []).filter(
    (child: GenericNode) => child.type === "tabItem"
  );
  if (items.length === 0) return null;
  const selected = items.find((item) => item.selected) ?? items[0]!;
  return (
    <Tabs className="mystmd-tabs my-8" defaultValue={String(selected.key)}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.key} className="px-4" value={String(item.key)}>
            {String(item.title ?? "")}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.key} className="pt-4" value={String(item.key)}>
          <MyST ast={item.children} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export const TABS_RENDERERS = { tabSet: TabSet };
