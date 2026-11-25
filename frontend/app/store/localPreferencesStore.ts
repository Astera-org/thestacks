import { create } from "zustand";

export type ListViewMode = "table" | "grid";

const DEFAULT_LIST_VIEW: ListViewMode = "grid";
const DEFAULT_PREFERENCES: LocalPreferencesStorage = {
  listView: DEFAULT_LIST_VIEW
};

interface LocalPreferencesState {
  listView: ListViewMode;
  setListView: (listView: ListViewMode) => void;
  rehydrate: () => void;
}

interface LocalPreferencesStorage {
  listView: ListViewMode;
}

const STORAGE_KEY = "stacks_local_preferences";

// Load from localStorage, with fallback to defaults if not available or malformed.
function loadLocalPreferences(): LocalPreferencesStorage {
  const prefs: LocalPreferencesStorage = { ...DEFAULT_PREFERENCES };
  if (typeof window === "undefined") {
    return prefs;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return prefs;
    }

    const parsed = JSON.parse(
      stored
    ) as Partial<LocalPreferencesStorage> | null;
    if (parsed?.listView === "table" || parsed?.listView === "grid") {
      prefs.listView = parsed.listView;
    }
  } catch {
    // Ignore malformed storage entries.
  }

  return prefs;
}

const extractPrefsToStore = (
  preferences: LocalPreferencesState
): LocalPreferencesStorage => {
  const { listView } = preferences;
  return { listView };
};

// Persist preferences to localStorage, ignoring write errors (e.g. quota exceeded).
function persistLocalPreferences(preferences: LocalPreferencesState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const prefsToStore = extractPrefsToStore(preferences);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefsToStore));
  } catch {
    // Ignore write failures.
  }
}

// Zustand store for local preferences, persisted to localStorage.
// Always initialize with the default so server and client start from the same
// state, avoiding SSR hydration mismatches. Call rehydrate() after mount to
// restore the user's saved preference from localStorage.
const useLocalPreferencesStore = create<LocalPreferencesState>((set) => {
  const setAndPersist = (preferences: LocalPreferencesStorage) => {
    set((state) => {
      const newState = { ...state, ...preferences };
      persistLocalPreferences(newState);
      return newState;
    });
  };
  return {
    listView: DEFAULT_LIST_VIEW,
    setListView: (listView) => {
      setAndPersist({ listView });
    },
    rehydrate: () => {
      setAndPersist(loadLocalPreferences());
    }
  };
});

export default useLocalPreferencesStore;
