import { Route } from ".react-router/types/app/pages/publications/[slug]/+types/index";
import { getPublication } from "@/api/publications";
import { getPublicationMdast } from "@/apiv1/mdast";
import AuthModal from "@/components/auth/AuthModal";
import BubbleMenu from "@/components/comments/BubbleMenu";
import CommentAuthProvider from "@/components/comments/CommentAuthProvider";
import InlineCommentThreads from "@/components/comments/InlineCommentThreads";
import InlineCommentThreadsSheet from "@/components/comments/InlineCommentThreadsSheet";
import NewInlineCommentSheet from "@/components/comments/NewInlineCommentSheet";
import { loadMystmdRenderer } from "@/components/mystmd/LazyMystmdRenderer";
import CommentsSection from "@/components/publication/CommentsSection";
import ContributorsSection from "@/components/publication/ContributorsSection";
import FeedbackFormSection from "@/components/publication/FeedbackFormSection";
import PublicationHeader from "@/components/publication/PublicationHeader";
import PublicationStateBanner from "@/components/publication/PublicationStateBanner";
import PublicationView from "@/components/publication/PublicationView";
import ReferencesSection from "@/components/publication/ReferencesSection";
import SocialSection from "@/components/publication/SocialSection";
import StickyTitleBanner from "@/components/publication/StickyTitleBanner";
import { TableOfContents } from "@/components/publication/TableOfContents";
import { useAuth } from "@/hooks/useAuth";
import { CommentVersionContext } from "@/hooks/useCommentVersions";
import { buildThreads } from "@/lib/comments/commentThreadData";
import { markdownToText } from "@/lib/markdown";
import { isMystPublication } from "@/lib/mystmd";
import {
  generatePublicationMetaTags,
  type PublicationMetaData
} from "@/lib/publications";
import type {
  LoaderArgs,
  LoaderData
} from "@/pages/publications/[slug]/publicationPage.types";
import { usePublicationHashNavigation } from "@/pages/publications/[slug]/usePublicationHashNavigation";
import { usePublicationInlineCommentFlow } from "@/pages/publications/[slug]/usePublicationInlineCommentFlow";
import { usePublicationPageData } from "@/pages/publications/[slug]/usePublicationPageData";
import { usePublicationReferences } from "@/pages/publications/[slug]/usePublicationReferences";
import { usePublicationToc } from "@/pages/publications/[slug]/usePublicationToc";
import { PublicationLayoutProvider } from "@/providers/PublicationLayoutProvider";
import { useMemo } from "react";
import { redirect, useLocation, useParams } from "react-router";
import invariant from "tiny-invariant";

export type { LoaderData } from "./publicationPage.types";

// This defines HTTP headers sent by the server for this specific page
export function headers({ parentHeaders }: Route.HeadersArgs) {
  // 1. Start with the parent's header configuration
  const mergedHeaders = new Headers(parentHeaders);

  // 2. Safely add or append child-specific overrides
  const vary = mergedHeaders.get("Vary");
  if (!vary) {
    mergedHeaders.set("Vary", "Accept");
  } else if (
    !vary
      .toLowerCase()
      .split(",")
      .map((v) => v.trim())
      .includes("accept")
  ) {
    mergedHeaders.set("Vary", `${vary}, Accept`);
  }

  return mergedHeaders;
}

/**
 * SSR loader — returns `null` for drafts so the client can fetch them
 * with the user's JWT (stored in local storage, unavailable server-side).
 */
export async function loader({
  params,
  request
}: LoaderArgs): Promise<LoaderData | null> {
  const isDraft = request.url.includes("/draft");
  if (isDraft) {
    return null;
  }

  const versionNumber =
    params.versionNumber && params.versionNumber.startsWith("v")
      ? Number(params.versionNumber.slice(1))
      : undefined;

  const url = new URL(request.url);
  const baseUrl = url.origin;

  let publication;
  try {
    publication = await getPublication(params.slug, versionNumber);
  } catch (error) {
    console.error(error);
    throw redirect("/not-found", { status: 404 });
  }

  // Strip markdown for OG / meta tags — these need plain text. A MyST
  // publication's AST is fetched alongside, so SSR renders the full article,
  // and so is its renderer, so the body renders without suspending (see
  // PublicationView).
  const [title, subtitle, abstract, mdast] = await Promise.all([
    markdownToText(publication.title ?? ""),
    markdownToText(publication.subtitle ?? ""),
    markdownToText(publication.abstract ?? ""),
    isMystPublication(publication)
      ? getPublicationMdast(publication.slug, publication.version_number).catch(
          (error: unknown) => {
            console.error("Failed to fetch the MyST AST", error);
            return null;
          }
        )
      : null,
    // Awaited only to preload the renderer; its result is not destructured.
    isMystPublication(publication) ? loadMystmdRenderer() : null
  ]);

  const selectedVersionNum = params.versionNumber?.startsWith("v")
    ? Number(params.versionNumber.slice(1))
    : params.versionNumber
      ? Number(params.versionNumber)
      : null;

  return {
    publication,
    mdast,
    title: title.trim(),
    subtitle: subtitle.trim(),
    abstract: abstract.trim(),
    baseUrl,
    versionNumber: selectedVersionNum,
    slug: params.slug
  };
}

export function meta({ loaderData }: { loaderData: LoaderData | null }) {
  if (!loaderData) {
    return [{ title: "Draft Publication | The Stacks" }];
  }

  const metadata: PublicationMetaData = {
    publication: loaderData.publication,
    title: loaderData.title || "Untitled Publication",
    subtitle: loaderData.subtitle,
    abstract: loaderData.abstract,
    baseUrl: loaderData.baseUrl,
    versionNumber: loaderData.versionNumber
  };

  return generatePublicationMetaTags(metadata);
}

export default function PublicationPage({
  loaderData
}: {
  loaderData: LoaderData | null;
}) {
  const versionNumber = loaderData ? loaderData.versionNumber : null;

  const { slug } = useParams();
  invariant(slug);

  const { user } = useAuth();
  const location = useLocation();

  const {
    isDraft,
    publication,
    mdast,
    isMdastLoading,
    comments,
    inlineComments,
    hasInlineCommentThreads,
    contributorsWithRoles,
    commentVersionValue,
    socialPostsCount,
    isPublicationEditor
  } = usePublicationPageData(slug, loaderData, user, location.pathname);

  const { handleRefUrlToNum, sortedReferences, referenceNumbers } =
    usePublicationReferences(publication, mdast);

  const { headings, activeHeadingId } = usePublicationToc(
    publication?.body,
    mdast
  );

  const {
    isReferencesOpen,
    setIsReferencesOpen,
    isCommentsOpen,
    setIsCommentsOpen,
    isFeedbackFormOpen,
    setIsFeedbackFormOpen,
    isSocialOpen,
    setIsSocialOpen,
    deepLinkCommentId,
    handleDeepLinkConsumed
  } = usePublicationHashNavigation(comments);

  const {
    isMobile,
    selectionRect,
    selectionValidation,
    handleBubbleMenuClick,
    showAuthModal,
    setShowAuthModal,
    showInlineCommentSheet,
    pendingSelectionData,
    createdInlineComment,
    handleAuthSuccess,
    handleInlineCommentSuccess,
    onNewInlineCommentSheetOpenChange,
    onInlineThreadsSheetOpenChange,
    onInlineThreadCommentWithdrawn
  } = usePublicationInlineCommentFlow(user);

  const createdInlineCommentThread = useMemo(() => {
    if (!createdInlineComment) return null;
    const allThreads = buildThreads(comments);
    return (
      allThreads.find(
        (t) => t.root.comment_id === createdInlineComment.comment_id
      ) ?? { root: createdInlineComment, replies: [] }
    );
  }, [createdInlineComment, comments]);

  if (isDraft && !publication) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-fg-muted">Loading draft...</div>
      </div>
    );
  }

  if (!publication) {
    return redirect("/not-found", { status: 404 });
  }

  return (
    <>
      <CommentVersionContext.Provider value={commentVersionValue}>
        <PublicationLayoutProvider>
          <StickyTitleBanner
            title={publication.title}
            numComments={comments.length}
            setIsCommentsOpen={setIsCommentsOpen}
          />

          {publication.state !== "PUBLISHED" && (
            <PublicationStateBanner state={publication.state} />
          )}

          <PublicationHeader
            publication={publication}
            selectedVersionId={publication.latest_version_id}
            selectedVersionNum={versionNumber}
            isPublicationEditor={isPublicationEditor}
          />
        </PublicationLayoutProvider>

        <div className="max-w-container mx-auto mb-10 w-full px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 md:pt-16">
            <section className="flex flex-col gap-10 pt-11 md:col-span-8 md:pt-0 md:pr-18">
              <PublicationView
                isDraft={isDraft}
                isMdastLoading={isMdastLoading}
                mdast={mdast}
                publication={publication}
                onRefUrlToNum={handleRefUrlToNum}
              />

              <div className="flex flex-col gap-4 empty:hidden md:gap-8">
                <FeedbackFormSection
                  className="print:hidden"
                  embedSrc={publication.feedback_form_embed_src}
                  isOpen={isFeedbackFormOpen}
                  onOpenChange={setIsFeedbackFormOpen}
                />

                <ContributorsSection
                  contributorsWithRoles={contributorsWithRoles}
                  pubOrgs={publication.orgs}
                />

                <ReferencesSection
                  references={sortedReferences}
                  referenceNumbers={referenceNumbers}
                  isOpen={isReferencesOpen}
                  onOpenChange={setIsReferencesOpen}
                />

                <CommentsSection
                  className="print:hidden"
                  publicationId={publication.id}
                  comments={comments}
                  contributorsWithRoles={contributorsWithRoles}
                  isOpen={isCommentsOpen}
                  onOpenChange={setIsCommentsOpen}
                />

                <SocialSection
                  className="print:hidden"
                  embedSrc={publication.social_posts_embed_src}
                  postsCount={socialPostsCount}
                  isOpen={isSocialOpen}
                  onOpenChange={setIsSocialOpen}
                />
              </div>
            </section>
            <aside className="md:relative md:col-span-4 md:flex md:flex-col print:hidden">
              <TableOfContents
                publication={publication}
                headings={headings}
                activeHeadingId={activeHeadingId}
                numComments={comments.length}
                hasContributors={contributorsWithRoles.length > 0}
                hasReferences={sortedReferences.length > 0}
                hasFeedbackForm={Boolean(publication.feedback_form_embed_src)}
                hasSocial={Boolean(publication.social_posts_embed_src)}
                setIsReferencesOpen={setIsReferencesOpen}
                setIsCommentsOpen={setIsCommentsOpen}
                setIsFeedbackFormOpen={setIsFeedbackFormOpen}
                setIsSocialOpen={setIsSocialOpen}
                showExport={isPublicationEditor}
              />
              {hasInlineCommentThreads && inlineComments.length > 0 && (
                <InlineCommentThreads
                  publicationId={publication.id}
                  comments={comments}
                  contributors={publication.contributors}
                  deepLinkCommentId={deepLinkCommentId}
                  onDeepLinkConsumed={handleDeepLinkConsumed}
                />
              )}
            </aside>
          </div>
        </div>
      </CommentVersionContext.Provider>

      {selectionRect && (
        <BubbleMenu
          selectionRect={selectionRect}
          disabled={selectionValidation.disabled}
          disabledReason={selectionValidation.reason}
          onClick={handleBubbleMenuClick}
          isMobile={isMobile}
        />
      )}

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />

      {pendingSelectionData && !createdInlineComment && (
        <NewInlineCommentSheet
          open={showInlineCommentSheet}
          onOpenChange={onNewInlineCommentSheetOpenChange}
          publicationId={publication.id}
          anchor={{
            anchor_text: pendingSelectionData.anchor,
            pre_text: pendingSelectionData.pre,
            post_text: pendingSelectionData.post,
            is_code: pendingSelectionData.isCode,
            anchor_html: pendingSelectionData.anchorHtml
          }}
          onNewCommentSuccess={handleInlineCommentSuccess}
        />
      )}

      {createdInlineCommentThread && (
        <CommentAuthProvider>
          <InlineCommentThreadsSheet
            open={showInlineCommentSheet}
            onOpenChange={onInlineThreadsSheetOpenChange}
            threads={[createdInlineCommentThread]}
            publicationId={publication.id}
            contributors={publication.contributors}
            onCommentWithdrawn={onInlineThreadCommentWithdrawn}
          />
        </CommentAuthProvider>
      )}
    </>
  );
}
