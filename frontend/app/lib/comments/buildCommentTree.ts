import { Comment } from "@/types";

/**
 * Returns an array of comments with all replies flattened and nested
 * under their top-level parent comments.
 */
export function buildCommentTree(comments: Comment[]): Comment[] {
  const idToCommentMap = new Map<number, Comment>();
  const topLevelComments: Comment[] = [];

  for (const comment of comments) {
    idToCommentMap.set(comment.comment_id, { ...comment, replies: [] });
  }

  // Helper function to find the top-level parent of a comment.
  // Comments are not expected to have more than one level of nesting,
  // but this is just in case.
  const findTopLevelParent = (commentId: number): number => {
    const comment = idToCommentMap.get(commentId);
    if (!comment || !comment.parent_id) return commentId;

    const parent = idToCommentMap.get(comment.parent_id);
    // Parent not found, treat current as top-level.
    if (!parent) return commentId;

    // Recursively find the top-level parent.
    return findTopLevelParent(comment.parent_id);
  };

  // Second pass: build the tree with only one level of nesting.
  for (const comment of comments) {
    if (comment.parent_id) {
      const topLevelParentId = findTopLevelParent(comment.parent_id);
      const topLevelParent = idToCommentMap.get(topLevelParentId);

      if (topLevelParent && topLevelParentId !== comment.comment_id) {
        if (!topLevelParent.replies) topLevelParent.replies = [];
        topLevelParent.replies.push(idToCommentMap.get(comment.comment_id)!);
      } else {
        // This comment has a parent_id, but no valid top-level parent was found.
        // Treat as top-level comment.
        topLevelComments.push(idToCommentMap.get(comment.comment_id)!);
      }
    } else {
      // No parent_id, it's a top-level comment.
      topLevelComments.push(idToCommentMap.get(comment.comment_id)!);
    }
  }

  // Sort top-level comments by creation date in descending order of creation date.
  topLevelComments.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Sort replies for each top-level comment in ascending order of creation date.
  for (const parent of topLevelComments) {
    if (parent.replies && parent.replies.length > 0) {
      parent.replies.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
  }

  return topLevelComments;
}
