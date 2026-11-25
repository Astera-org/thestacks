import { getAuth, http, updateAuthUser } from "@/api/client";
import { Organization, PaginatedPublications, User } from "@/types";

export async function getUser(username: string): Promise<User> {
  const res = await http.get<User>(`/users/${username}`);
  return res.data;
}

/**
 * Find potential user matches by a free-form identifier.
 * GET /users/match?id=<term>
 */
export async function matchUsers(term: string): Promise<User[]> {
  const res = await http.get<User[]>("/users/match", { params: { id: term } });
  return res.data;
}

/**
 * List organizations a user belongs to.
 * GET /users/:id/orgs -> Organization[]
 */
export async function getUserOrganizations(
  id: number
): Promise<Organization[]> {
  const res = await http.get<Organization[]>(`/users/${id}/orgs`);
  return res.data;
}

export async function updateUser(
  id: number,
  payload: Partial<User>
): Promise<User> {
  const res = await http.put<{ user_id: number } | User>(
    `/users/${id}`,
    payload
  );

  let updatedUser: User;
  if ("user_id" in res.data && typeof res.data.user_id === "number") {
    const full = await http.get<User>(`/users/${res.data.user_id}`);
    updatedUser = full.data;
  } else {
    updatedUser = res.data as User;
  }

  const auth = getAuth();
  if (auth && auth.user.id === id) {
    updateAuthUser(updatedUser);
  }
  return updatedUser;
}

/**
 * List all publications a given user contributed to.
 * GET /users/:id/publications is expected to return the same shape
 * as /publications/ (PaginatedPublications).
 */
export async function getUserPublications(
  id: number,
  params?: { page?: number; per_page?: number }
): Promise<PaginatedPublications> {
  const res = await http.get<PaginatedPublications>(
    `/users/${id}/publications`,
    {
      params
    }
  );
  return res.data;
}

/**
 * Upload a new avatar for the given user.
 * Expects a File object. Returns `{ avatar_url: string }`.
 */
export async function uploadUserAvatar(
  userId: number,
  file: File
): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await http.post<{ avatar_url: string }>(
    `/users/${userId}/avatar`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
  return res.data;
}
