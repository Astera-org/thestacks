import { http } from "@/api/client";

export async function getSitemap(
  headers?: Record<string, string>
): Promise<string> {
  const res = await http.get<string>("/sitemap", {
    responseType: "text",
    headers
  });
  return res.data;
}

export async function getSitemapPublications(
  headers?: Record<string, string>
): Promise<string> {
  const res = await http.get<string>("/sitemap/publications", {
    responseType: "text",
    headers
  });
  return res.data;
}

export async function getSitemapUsers(
  headers?: Record<string, string>
): Promise<string> {
  const res = await http.get<string>("/sitemap/users", {
    responseType: "text",
    headers
  });
  return res.data;
}

export async function getSitemapOrganizations(
  headers?: Record<string, string>
): Promise<string> {
  const res = await http.get<string>("/sitemap/organizations", {
    responseType: "text",
    headers
  });
  return res.data;
}
