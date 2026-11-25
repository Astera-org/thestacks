import { http } from "@/apiv1/client";
import { LimitedUserV1, PaginatedResponseV1 } from "@/types/v1";

/**
 * Find potential user matches by a free-form identifier.
 * GET /users/search?q=<term>
 */
export async function searchUsers(
  term: string
): Promise<PaginatedResponseV1<LimitedUserV1>> {
  const res = await http.get<PaginatedResponseV1<LimitedUserV1>>("/users", {
    params: { q: term }
  });
  return res.data;
}
