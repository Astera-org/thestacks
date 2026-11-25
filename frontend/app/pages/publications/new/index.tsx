import { createImport } from "@/apiv1/imports";
import { myDrafts } from "@/apiv1/publications";
import Link from "@/components/Link";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { TimeFromNow } from "@/components/TimeFromNow";
import { ChevronRightIcon } from "@/components/icons";
import ArrowRight from "@/components/icons/ArrowRight";
import GoogleDocsIcon from "@/components/icons/GoogleDocs";
import Button from "@/components/stacks-ui/Button";
import LinkButton from "@/components/stacks-ui/LinkButton";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { markdownToTextSync } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import type { ImportResultState } from "@/pages/publications/[slug]/change/use-import-result-toast";
import { PaginatedDraftsV1 } from "@/types/v1";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Create a Pub | The Stacks" }];
}

const IMPORT_STEPS = [
  { title: "Connect", detail: "Import and link your Google Doc" },
  { title: "Auto-fill", detail: "Title, subtitle, abstract, body" },
  { title: "Describe & Release", detail: "Add metadata and invite teammates" }
];

function ImportSteps() {
  return (
    <ol className="border-border-strong grid overflow-hidden rounded-xl border md:grid-cols-3">
      {IMPORT_STEPS.map((step, i) => (
        <li
          key={step.title}
          className="border-border-strong relative flex flex-col items-center gap-1 border-t px-6 py-6 text-center first:border-t-0 md:border-t-0 md:py-5"
        >
          <span className="border-border-strong text-body-20 text-fg-strong mb-2 flex size-10 items-center justify-center rounded-full border">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-body-30 text-fg-strong font-medium">
            {step.title}
          </span>
          <span className="text-body-20 text-fg-muted">{step.detail}</span>
          {i < IMPORT_STEPS.length - 1 && (
            <span
              aria-hidden
              className="border-border-strong absolute top-1/2 right-0 hidden size-25 translate-x-1/2 -translate-y-1/2 rotate-45 border-t border-r md:block"
            />
          )}
        </li>
      ))}
    </ol>
  );
}

// ——— Import status —————————————————————————————————————————

function ElapsedTime({ className }: { className?: string }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.floor((now - startedAt) / 1000);
  const display = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  // Hidden from assistive tech so a surrounding live region does not
  // re-announce the status every second.
  return (
    <span aria-hidden className={className}>
      {display}
    </span>
  );
}

// ——— Import hero ——————————————————————————————————————————

function HeroLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden md:block"
    >
      <div className="border-sky-blue-400 absolute inset-x-0 top-1/2 border-t" />
      <div className="border-sky-blue-400 bg-pub-header relative mx-auto h-full max-w-5xl border-x" />
    </div>
  );
}

function ImportHero({
  onImportSuccess
}: {
  onImportSuccess: (id: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const importing = status !== null;

  const handleImport = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || importing) return;
    setStatus("Reading your Google Doc…");
    try {
      const newPub = await createImport({
        source: { type: "url", url: trimmedUrl }
      });
      onImportSuccess(newPub.publicationId.toLowerCase());
    } catch (e: any) {
      toast.error(
        e.message ??
          "Unable to import the Google Doc. Check that the link is shared with anyone who has it, then try again."
      );
    } finally {
      setStatus(null);
    }
  }, [url, importing, onImportSuccess]);

  return (
    <>
      <section className="bg-pub-header relative overflow-hidden">
        <HeroLines />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-12 pb-20 text-center md:pt-14 md:pb-24">
          <span className="border-sky-blue-400 bg-pub-header text-caption-30 text-fg inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono">
            <GoogleDocsIcon height={14} width={14} />
            Start with Google Docs
          </span>
          <h1 className="text-headline-60 text-fg-strong mt-6 max-w-3xl font-serif text-balance md:mt-8">
            Paste a Google Doc Link to Get Started.{" "}
            <span className="text-gray-blue-400">We’ll Do The Rest.</span>
          </h1>
          <p className="text-body-40 text-fg-muted mt-5 max-w-4xl md:mt-6">
            The Stacks will import your title, subtitle, abstract, body,
            figures, and citations, formatting preserved.
          </p>
        </div>
      </section>

      <div className="relative mx-auto -mt-10 w-full max-w-321 px-4 md:px-8">
        <form
          className="bg-surface flex flex-col gap-2 rounded-xl p-2 shadow-md sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleImport();
          }}
        >
          <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <GoogleDocsIcon className="shrink-0" height={20} width={20} />
            <span className="sr-only">Google Docs URL</span>
            <input
              className="text-body-30 md:text-body-20 text-fg placeholder:text-carbon-400 h-12 min-w-0 flex-1 bg-transparent font-mono outline-none"
              disabled={importing}
              placeholder="https://docs.google.com/document/d/…"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <Button
            className="w-full gap-2 sm:w-fit"
            disabled={importing || !url.trim()}
            pill={false}
            size="lg"
            type="submit"
          >
            {importing ? (
              <>
                Importing
                <LoadingSpinner isDark />
              </>
            ) : (
              <>
                Import <ArrowRight aria-hidden className="size-3.5" />
              </>
            )}
          </Button>
        </form>

        <p
          className="text-caption-30 text-fg-muted mt-3 flex min-h-5 items-center gap-3 px-2 font-mono"
          role="status"
        >
          {status && (
            <>
              <span>{status}</span>
              <ElapsedTime className="tabular-nums" />
            </>
          )}
        </p>
      </div>
    </>
  );
}

// ——— Recent drafts ————————————————————————————————————————

function RecentDraftsCard() {
  const { data: drafts, isLoading } = useQuery<PaginatedDraftsV1>({
    queryKey: ["my_drafts", { perPage: 100 }],
    queryFn: () => myDrafts({ perPage: 100 })
  });

  if (!isLoading && !drafts?.items.length) return null;

  return (
    <section
      aria-labelledby="unfinished-pubs"
      className="border-border bg-surface overflow-hidden rounded-xl border"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-5 md:px-6">
        <h2
          className="text-headline-20 text-fg-strong font-serif"
          id="unfinished-pubs"
        >
          Your unfinished Pubs
        </h2>
        <LinkButton
          className="shrink-0 gap-1.5"
          intent="outline"
          size="sm"
          to="/account/publications"
        >
          View all drafts
          <ChevronRightIcon aria-hidden className="size-4" />
        </LinkButton>
      </div>

      {isLoading ? (
        <div className="border-border flex h-20 items-center justify-center border-t">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <ul>
          {drafts?.items.map((draft) => (
            <li key={draft.versionId} className="border-border border-t">
              <Link
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-100 md:px-6"
                to={`/publications/${draft.publicationId.toLowerCase()}/edit`}
              >
                <span className="text-fg-strong flex size-12 shrink-0 items-center justify-center rounded-lg bg-gray-200">
                  <FileText aria-hidden className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    title={
                      draft.title ? markdownToTextSync(draft.title) : undefined
                    }
                    className={cn(
                      "text-body-30 block truncate font-medium *:truncate group-hover:underline group-hover:underline-offset-4",
                      draft.title ? "text-fg-strong" : "text-fg-muted italic"
                    )}
                  >
                    {draft.title ? (
                      <MarkdownRenderer isAnchorChild markdown={draft.title} />
                    ) : (
                      "Untitled draft"
                    )}
                  </span>
                  {/* @todo: pub type, author and progress once drafts return them. */}
                  <span className="text-body-20 text-fg-muted mt-1 flex items-center gap-1.5">
                    <Clock aria-hidden className="size-3.5" />
                    edited <TimeFromNow date={draft.updatedAt} lower />
                  </span>
                </span>
                <ChevronRightIcon
                  aria-hidden
                  className="text-fg-strong size-5 shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function NewPublicationPage() {
  const { user, isPending } = useAuth();
  const navigate = useAppNavigate();

  useEffect(() => {
    if (!isPending) {
      if (!user) {
        navigate("/login", { replace: true });
      } else if (!user.can_create_publications) {
        navigate("/", { replace: true });
      }
    }
  }, [user, isPending, navigate]);

  const handleImportSuccess = useCallback(
    (id: string) => {
      // The edit page reports how the import went once the draft has loaded.
      const state: ImportResultState = { justImported: true };
      navigate(`/publications/${id.toLowerCase()}/edit`, { state });
    },
    [navigate]
  );

  return (
    <div className="bg-off-white min-h-svh pb-16 font-sans md:pb-24">
      <ImportHero onImportSuccess={handleImportSuccess} />
      <div className="mx-auto mt-8 flex w-full max-w-321 flex-col gap-8 px-4 md:mt-10 md:gap-10 md:px-8">
        <ImportSteps />
        <RecentDraftsCard />
      </div>
    </div>
  );
}
