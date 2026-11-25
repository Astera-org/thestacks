import { loadMystmdRenderer } from "@/components/mystmd/LazyMystmdRenderer";
import { keyBrowserHistoryEntries } from "@/lib/browserHistoryEntries";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

keyBrowserHistoryEntries();

// A server-rendered MyST body (a publication's, or a site page's such as
// About) hydrates only once its renderer has loaded, as the server rendered it
// without a Suspense boundary (see PublicationView). If the download fails, it
// hydrates anyway, and the page's fallback takes over.
const beforeHydration = document.querySelector(".prose.mystmd")
  ? loadMystmdRenderer()
  : Promise.resolve();

void beforeHydration.then(hydrate);

function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    );
  });
}
