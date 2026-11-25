import { listComments } from "@/api/comments";
import { getDraft, getUserPubPermissions } from "@/api/publications";
import { getDraftMdast } from "@/apiv1/mdast";
import {
  buildVersionMap,
  getLatestVersionId
} from "@/hooks/useCommentVersions";
import { useSocialPostsCount } from "@/hooks/useSocialPostsCount";
import { isMystPublication } from "@/lib/mystmd";
import { getContributorsWithRoles } from "@/lib/utils/get-contributors-with-roles";
import type { LoaderData } from "@/pages/publications/[slug]/publicationPage.types";
import type { Comment, Publication, User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Resolves the publication (SSR or client-side draft), fetches permissions,
 * comments, and derives display-ready data (contributors, version context, etc.).
 */
export function usePublicationPageData(
  slug: string,
  loaderData: LoaderData | null,
  user: User | null | undefined,
  pathname: string
) {
  const isDraft = pathname.includes("/draft");

  // Drafts are fetched client-side because the backend requires a JWT that
  // is only available in the browser (local storage).
  const {
    data: draftPublication,
    isLoading: isDraftPublicationLoading,
    dataUpdatedAt: draftUpdatedAt
  } = useQuery<Publication>({
    queryKey: ["draft", slug],
    queryFn: () => getDraft(slug).then((res) => res.publication),
    enabled: isDraft && !!user,
    retry: false
  });

  const publication = isDraft
    ? isDraftPublicationLoading
      ? null
      : draftPublication
    : loaderData == null
      ? null
      : loaderData.publication;

  // A MyST draft's AST. Keyed on when the draft was fetched, since v0 drafts
  // carry no update time: a refetched (possibly edited) draft gets a fresh AST.
  // The draft's previous AST stays on screen meanwhile, so a refetch (on
  // window focus, say) does not swap the body for a placeholder.
  const isMystDraft = isDraft && isMystPublication(draftPublication);
  const draftUlid = draftPublication?.publication_ulid;
  const { data: draftMdast, isLoading: isDraftMdastLoading } = useQuery({
    queryKey: ["mdast", "draft", draftUlid, draftUpdatedAt],
    queryFn: () => getDraftMdast(draftUlid!),
    enabled: isMystDraft,
    retry: false,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === draftUlid ? previousData : undefined
  });

  const mdast = isDraft ? (draftMdast ?? null) : (loaderData?.mdast ?? null);
  // True while a MyST draft's AST is on its way, so the page shows a
  // placeholder rather than flashing the older renderer.
  const isMdastLoading = isMystDraft && isDraftMdastLoading;

  const { data: permissionsData } = useQuery({
    queryKey: ["permissions", publication?.slug, user?.id],
    queryFn: () => getUserPubPermissions(publication!.slug),
    enabled: Boolean(user?.id && publication?.slug)
  });

  const { data: commentData } = useQuery({
    queryKey: ["comments", publication?.id],
    queryFn: () => {
      if (!publication?.id) {
        throw new Error("Publication ID not available");
      }
      return listComments(publication.id);
    },
    enabled: !!publication?.id
  });

  const comments = useMemo<Comment[]>(
    () => commentData?.items ?? [],
    [commentData]
  );

  const inlineComments = useMemo<Comment[]>(
    () => comments.filter((c) => Boolean(c.anchor_text?.trim())),
    [comments]
  );

  const hasInlineCommentThreads = useMemo(
    () => comments.some((comment) => comment.anchor_text != null),
    [comments]
  );

  // The API returns one row per contributor-role pair; collapse into a single
  // entry per user with an aggregated `roles` array for the ContributorsSection.
  const contributorsWithRoles = useMemo(() => {
    return getContributorsWithRoles(publication?.contributors ?? []);
  }, [publication?.contributors]);

  const versionMap = useMemo(
    () => buildVersionMap(publication?.versions),
    [publication?.versions]
  );

  const latestVersionId = useMemo(
    () => getLatestVersionId(publication?.versions),
    [publication?.versions]
  );

  // The version the reader is currently viewing. The URL carries a version
  // number (null means the latest); resolve it to a version id so comments can
  // tell whether they belong to the version on screen. Falls back to the latest
  // when no version is pinned or the number can't be matched.
  const viewedVersionId = useMemo(() => {
    const viewedNum = loaderData?.versionNumber ?? null;
    if (viewedNum == null) return latestVersionId;
    const match = publication?.versions?.find(
      (v) => v.version_number === viewedNum
    );
    return match?.id ?? latestVersionId;
  }, [loaderData?.versionNumber, publication?.versions, latestVersionId]);

  // Provides version-aware comment rendering: comments are pinned to the
  // version they were created on, and the context lets child components know
  // which version is the one being viewed vs a different (historical or newer)
  // one, so a comment only flags a version mismatch against what's on screen.
  const commentVersionValue = useMemo(
    () => ({
      currentVersionId: viewedVersionId,
      versionMap
    }),
    [viewedVersionId, versionMap]
  );

  const socialPostsCount = useSocialPostsCount(
    publication?.social_posts_embed_src
  );

  return {
    isDraft,
    publication,
    mdast,
    isMdastLoading,
    permissionsData,
    comments,
    inlineComments,
    hasInlineCommentThreads,
    contributorsWithRoles,
    commentVersionValue,
    socialPostsCount,
    isPublicationEditor: permissionsData?.can_edit ?? false
  };
}
