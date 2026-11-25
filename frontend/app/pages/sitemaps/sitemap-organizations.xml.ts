import { getSitemapOrganizations } from "@/api/sitemap";
import { LoaderFunctionArgs, redirect } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const host = request.headers.get("host");
    const xml = await getSitemapOrganizations({
      "X-Forwarded-Host": host || ""
    });

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Failed to load organizations sitemap", error);
    throw redirect("/not-found", { status: 404 });
  }
}
