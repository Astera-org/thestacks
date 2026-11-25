import type { ComponentProps, ReactNode } from "react";
import { use, useEffect } from "react";

type MystmdRendererModule = typeof import("./MystmdRenderer");

let loaded: MystmdRendererModule | null = null;
let loading: Promise<MystmdRendererModule | null> | null = null;

/** Whether the MyST renderer has loaded, so it renders without suspending. */
export function isMystmdRendererLoaded() {
  return loaded != null;
}

/**
 * Downloads the MyST renderer, so pages that are not MyST never do. Resolves
 * to null if the download fails.
 */
export function loadMystmdRenderer() {
  loading ??= import("./MystmdRenderer").then(
    (module) => (loaded = module),
    (error: unknown) => {
      console.error("Failed to load the MyST renderer", error);
      return null;
    }
  );
  return loading;
}

/** Forgets a failed download, so the next render downloads it again. */
function forgetFailedLoad() {
  if (loaded == null) loading = null;
}

/**
 * `MystmdRenderer`, loaded on first use. Unlike `React.lazy`, it renders
 * without suspending once `loadMystmdRenderer` has resolved. The publication
 * loader awaits that on the server and the client entry before hydrating, so a
 * server-rendered MyST body needs no Suspense boundary (see PublicationView).
 * If the download fails, it renders `fallback`.
 */
export default function LazyMystmdRenderer({
  fallback,
  ...props
}: ComponentProps<MystmdRendererModule["default"]> & { fallback: ReactNode }) {
  const module = loaded ?? use(loading ?? loadMystmdRenderer());
  // Forgotten only once the fallback is on screen: forgetting it while
  // rendering would start a new download on each retry, without end offline.
  useEffect(() => {
    if (module == null) forgetFailedLoad();
  }, [module]);
  if (module == null) return fallback;
  const { default: MystmdRenderer } = module;
  return <MystmdRenderer {...props} />;
}
