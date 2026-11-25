import { RequestError } from "@/api/errors";
import { createImport, getImport } from "@/apiv1/imports";
import { deleteDraft, publishPublication } from "@/apiv1/publications";
import { SECTION_FIELDS } from "@/hooks/use-edit-publication/fields";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { useEditPublication } from "@/hooks/useEditPublication";
import { PublicationV1 } from "@/types/v1";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Route } from "./+types/index";
import ChangePageHeader from "./components/ChangePageHeader";
import ContentSection from "./components/ContentSection";
import DangerZone from "./components/DangerZone";
import DetailsSection from "./components/DetailsSection";
import FiguresSection from "./components/FiguresSection";
import { FullEditorState } from "./components/FullEditorModal";
import ImportIssuesSection from "./components/ImportIssuesSection";
import LoadErrorState from "./components/LoadErrorState";
import LoadFailedState from "./components/LoadFailedState";
import ReleaseBar from "./components/ReleaseBar";
import ReleaseModal from "./components/ReleaseModal";
import { ReleaseTasks } from "./components/ReleaseTasks";
import SwitchDocModal from "./components/SwitchDocModal";
import { VersionDescription } from "./components/VersionDescription";
import { BodyFigure, extractFigures } from "./helpers/extract-figures";
import { isBodyBehindUploads } from "./helpers/is-body-behind-uploads";
import { linkedGoogleDoc } from "./linked-google-doc";
import { useImportResultToast } from "./use-import-result-toast";

export function meta() {
  return [{ title: "Edit Publication | The Stacks" }];
}

export default function ChangePublicationPage({
  params,
}: Route.ComponentProps) {
  const { user, isPending } = useAuth();
  const { pubId } = params;
  const [publishError, setPublishError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [switchDocOpen, setSwitchDocOpen] = useState(false);
  const [fullEditor, setFullEditor] = useState<FullEditorState>({
    open: false,
  });
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({
    content: false,
    // Figures should start collapsed
    figures: true,
    importIssues: false,
    details: false,
    access: false,
    versionDescription: false,
  });

  const navigate = useAppNavigate();

  const toggleCollapse = useCallback(
    (k: keyof typeof collapsed) => setCollapsed((c) => ({ ...c, [k]: !c[k] })),
    []
  );

  const {
    commit,
    // errorFor,
    fieldErrors,
    /** Send anything buffered right now — blur handlers, explicit Save. */
    flush,
    hasRejected,
    isDirty,
    // isLoading,
    isOnline,
    isReadOnly,
    loadError,
    // lookupCommit,
    publication,
    reload,
    replaceFields,
    /** Clear a transport block and try again immediately. */
    retry,
    setFieldErrors,
    status,
    /** Per-field pipeline state, for inline spinners and check marks. */
    // statusFor,
    statusForFields,
    transportError,
    validatePublication,
  } = useEditPublication(pubId);

  useImportResultToast(publication);

  const importStatusQueryResult = useQuery({
    queryKey: ["pubImportStatus", pubId, publication?.importDocument?.id],
    queryFn: () => getImport(publication!.importDocument!.id!),
    refetchInterval: (query) => {
      const { fetchFailureReason } = query.state;
      if (fetchFailureReason instanceof RequestError) {
        const { apiError } = fetchFailureReason;
        // Stop polling on 400 errors
        if (
          apiError.kind === "http" &&
          apiError.status >= 400 &&
          apiError.status < 500
        ) {
          return false;
        }
      }
      // Poll slower for unexpected responses
      if (query.state.data === undefined) return 10_000;

      // Stop polling once the job finishes
      if (query.state.data.settled) return false;

      return 1000;
    },
    enabled: Boolean(publication?.importDocument?.id),
  });

  // The server swaps each upload's URL into the body as it finishes. A body
  // fetched before that still has the refs, so fetch it again once the import
  // has settled. Checked against the data rather than on settling, which the
  // page misses when the first status it gets is already settled.
  const isBehindUploads = useMemo(
    () => isBodyBehindUploads(publication?.body, importStatusQueryResult.data),
    [publication?.body, importStatusQueryResult.data]
  );
  useEffect(() => {
    if (isBehindUploads) reload();
  }, [isBehindUploads, reload]);

  /** Re-imports a Google Doc into the draft on the server: Re-sync, or Switch doc. */
  const reimportDoc = useCallback(
    async (url: string) => {
      try {
        await replaceFields(
          ["title", "subtitle", "abstract", "body", "importDocument"],
          () =>
            createImport({
              source: { type: "url", url },
              target: { type: "draft", publicationId: pubId },
            })
        );
      } catch (e) {
        // A doc that can't be converted comes back as a validation error;
        // its issue says why.
        if (e instanceof RequestError && e.apiError.kind === "validation") {
          throw new Error(e.apiError.issues[0]?.message ?? e.message, {
            cause: e,
          });
        }
        throw e;
      }
    },
    [pubId, replaceFields]
  );

  const isPreviouslyPublished = publication?.state === "PUBLISHED";
  const figures = useBodyFigures(publication?.body ?? "");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!publication?.id) {
        throw new Error("Publication not loaded yet.");
      }
      await deleteDraft(publication.id);
      return;
    },
    onSuccess: () => {
      navigate("/publications/new", { replace: true });
    },
    onError: (err) => {
      if (err instanceof RequestError) {
        const { apiError } = err;
        setDeleteError(apiError.message);
        return;
      }
      // Report other errors too
      setDeleteError(err.message);
    },
    retry: false,
  });

  const publishMutation = useMutation<
    PublicationV1 | undefined,
    Error,
    string | null
  >({
    mutationFn: async (note: string | null) => {
      if (!publication?.slug) {
        throw new Error("Publication not loaded yet.");
      }
      setPublishError(null);
      const pub = await publishPublication(publication.id, note);
      if (pub.state === "PUBLISHED") {
        return pub;
      }
      const error = "Unexpected error when publishing";
      toast.error(error);
      throw new Error(error);
    },
    onSuccess: (pub) => {
      // Full page load, not a client-side navigate: if the publication route's
      // module fails to load (stale chunks after a deploy, or Vite re-optimizing
      // deps in dev), React Router reloads the *current* URL, and this page's
      // draft no longer exists once it has been released.
      window.location.replace(`/publications/${pub!.slug}`);
    },
    onError: (err) => {
      if (err instanceof RequestError) {
        const { apiError } = err;
        if (apiError.kind === "validation") {
          setFieldErrors(apiError.issues);
          return;
        }
        setPublishError(apiError.message);
        return;
      }
      // Report other errors too
      setPublishError(err.message);
    },
    retry: false,
  });

  const contributorsWithRoles = publication?.contributors ?? [];
  const googleDoc = linkedGoogleDoc(publication?.importDocument);

  const releaseTasksRef = useRef<HTMLDivElement>(null);

  const handleOnRelease = useCallback(() => {
    if (validatePublication()) {
      setReleaseOpen(true);
      return;
    }
    // Show the checklist of things to fix. Wait a frame so it has re-rendered
    // with the new errors before it is announced.
    requestAnimationFrame(() => {
      const tasks = releaseTasksRef.current;
      if (!tasks) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      tasks.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      tasks.focus({ preventScroll: true });
    });
  }, [validatePublication]);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/login", { replace: true });
    }
  }, [isPending, navigate, user]);

  if (loadError && !publication) {
    return (
      <div className="bg-off-white min-h-svh font-sans">
        <LoadErrorState error={loadError} onRetry={reload} />
      </div>
    );
  }

  if (transportError && !publication) {
    return (
      <div className="bg-off-white min-h-svh font-sans">
        <LoadFailedState error={transportError} onRetry={retry} />
      </div>
    );
  }
  return (
    <div className="bg-off-white min-h-svh pb-16 font-sans md:pb-24">
      <ChangePageHeader
        key={`header-${publication?.id ?? ""}`}
        importDocument={googleDoc}
        publication={publication}
        saveError={!isOnline ? "offline" : transportError ? "failed" : null}
        status={status}
        title={publication?.title}
        onRetry={retry}
      />

      <div className="mx-auto flex w-full max-w-321 flex-col gap-3 px-4 pt-6 md:px-8 md:pt-10">
        <ContentSection
          key={`content-${publication?.id ?? ""}`}
          collapsed={collapsed.content}
          fieldErrors={fieldErrors}
          fullEditor={fullEditor}
          hideBody={Boolean(releaseOpen && publication)}
          importStatusResult={importStatusQueryResult}
          isReadOnly={isReadOnly}
          publication={publication}
          status={statusForFields(SECTION_FIELDS.content)}
          onCommit={commit}
          onFullEditorChange={setFullEditor}
          onReimport={reimportDoc}
          onSwitchDoc={() => setSwitchDocOpen(true)}
          onToggleCollapse={() => toggleCollapse("content")}
        />
        <FiguresSection
          key={`figures-${publication?.id ?? ""}`}
          collapsed={collapsed.figures}
          figures={figures}
          importStatusResponse={importStatusQueryResult}
          isReadOnly={isReadOnly}
          publication={publication}
          status={status}
          onShowInEditor={(focusRange) =>
            setFullEditor({ open: true, focusRange })
          }
          onToggleCollapse={() => toggleCollapse("figures")}
        />
        <ImportIssuesSection
          key={`import-issues-${publication?.id ?? ""}`}
          collapsed={collapsed.importIssues}
          figures={figures}
          importStatusResponse={importStatusQueryResult}
          isReadOnly={isReadOnly}
          publication={publication}
          status={status}
          onShowFigure={() => setCollapsed((c) => ({ ...c, figures: false }))}
          onShowInEditor={(focusRange) =>
            setFullEditor({ open: true, focusRange })
          }
          onToggleCollapse={() => toggleCollapse("importIssues")}
        />
        <DetailsSection
          key={`detail-${publication?.id ?? ""}`}
          collapsed={collapsed.details}
          contributors={contributorsWithRoles}
          fieldErrors={fieldErrors}
          isReadOnly={isReadOnly}
          publication={publication}
          publicationId={pubId}
          status={statusForFields(SECTION_FIELDS.details)}
          onCommit={commit}
          onToggleCollapse={() => toggleCollapse("details")}
        />
        {/* Access section is hidden until the backend supports per-pub access. */}

        {status.status !== "init" && isPreviouslyPublished && (
          <VersionDescription
            key={`versionDescription-${publication?.id ?? ""}`}
            collapsed={collapsed.versionDescription}
            fieldErrors={fieldErrors}
            status={statusForFields(SECTION_FIELDS.versionDescription)}
            versionDescription={publication?.versionDesc ?? ""}
            onChange={(value) => commit("versionDesc", value)}
            onToggleCollapse={() => toggleCollapse("versionDescription")}
          />
        )}

        {status.status !== "init" && (
          <section
            aria-label="Release"
            className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-5 py-7 md:p-9"
          >
            <DangerZone
              deleteError={deleteError}
              deleteMutation={deleteMutation}
              disabled={isReadOnly}
            />
            <ReleaseTasks
              ref={releaseTasksRef}
              fieldErrors={fieldErrors}
              isPreviouslyPublished={isPreviouslyPublished}
            />
            <ReleaseBar
              hasRejected={hasRejected}
              isDirty={isDirty}
              isPreviouslyPublished={isPreviouslyPublished}
              isReadOnly={isReadOnly}
              status={status}
              onRelease={handleOnRelease}
              onRetry={retry}
              onSave={flush}
            />
          </section>
        )}
      </div>

      <SwitchDocModal
        importDocument={googleDoc}
        open={switchDocOpen}
        onClose={() => setSwitchDocOpen(false)}
        onCommit={commit}
        onReimport={reimportDoc}
      />

      <ReleaseModal
        fieldErrors={fieldErrors}
        note={publication?.versionDesc}
        open={Boolean(releaseOpen && publication)}
        publishError={publishError}
        publishMutation={publishMutation}
        slug={publication?.slug ?? ""}
        title={publication?.title ?? ""}
        versionNumber={publication?.versionNumber}
        onClose={() => setReleaseOpen(false)}
        onCommit={commit}
      />
    </div>
  );
}

/**
 * The figures in the body, for the figures and import issues sections.
 * Parsing the whole body is too slow to redo on every keystroke, so edits are
 * parsed once they pause; the body as first loaded is parsed straight away.
 */
function useBodyFigures(body: string): BodyFigure[] {
  const debounced = useDebounce(body, 1000);
  const parsed = debounced || body;
  return useMemo(() => extractFigures(parsed), [parsed]);
}
