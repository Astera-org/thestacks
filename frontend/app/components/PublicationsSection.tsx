import { GridIcon, ListIcon } from "@/components/icons";
import PublicationCardGrid from "@/components/PublicationCardGrid";
import PublicationList from "@/components/PublicationList";
import SegmentedControl, {
  type SegmentedControlOption
} from "@/components/stacks-ui/SegmentedControl";
import useLocalPreferencesStore, {
  type ListViewMode
} from "@/store/localPreferencesStore";
import type { Publication } from "@/types";
import { useShallow } from "zustand/react/shallow";

export interface PublicationsSectionProps {
  publications: Publication[];
  heading: React.ReactNode;
  className?: string;
}

const VIEW_OPTIONS: SegmentedControlOption<ListViewMode>[] = [
  { value: "grid", label: "Card view", icon: GridIcon },
  { value: "table", label: "List view", icon: ListIcon }
];

// Publications with a card/list view toggle. The chosen view is a local
// preference shared by every page that renders this section.
export default function PublicationsSection(props: PublicationsSectionProps) {
  const { publications, heading, className } = props;

  const { listView, setListView } = useLocalPreferencesStore(
    useShallow((state) => ({
      listView: state.listView,
      setListView: state.setListView
    }))
  );

  return (
    <div className={className} data-vt-list-anchor>
      <div className="mb-12 flex items-center justify-between gap-4">
        {heading}
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={listView}
          onValueChange={setListView}
          label="Publication view"
        />
      </div>
      {/* Named during pagination only, so just the results animate. */}
      <div data-vt="pub-list">
        {listView === "table" && (
          <PublicationList publications={publications} />
        )}
        {listView === "grid" && (
          <PublicationCardGrid publications={publications} />
        )}
      </div>
    </div>
  );
}
