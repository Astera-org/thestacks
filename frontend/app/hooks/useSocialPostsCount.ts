import { useEffect, useState } from "react";

/**
 * Fetches content from a social feed URL and returns the count of tweets
 * (blockquotes with `twitter-tweet` class) found in the HTML.
 *
 * This is a hardcoded workaround to update the social posts count from the
 * embedded Twitter collections iframe from `publishing-tools.arcadiascience.com`.
 */
async function fetchTweetCount(src: string): Promise<number | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) {
      console.warn(
        `useSocialPostsCount: Failed to fetch content: ${response.status}`
      );
      return 0;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.querySelectorAll("blockquote.twitter-tweet").length;
  } catch (error) {
    console.warn("useSocialPostsCount: Error fetching content:", error);
    return null;
  }
}

export function useSocialPostsCount(
  src: string | null | undefined
): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!src) return;
    fetchTweetCount(src).then(setCount).catch(console.error);
  }, [src]);

  return count;
}
