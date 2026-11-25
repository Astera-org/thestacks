import NotFoundComponent from "@/components/NotFound";
import { data } from "react-router";

export function meta() {
  return [
    { title: "404 | The Stacks" },
    { property: "og:title", content: "404" },
    {
      property: "og:description",
      content:
        "The page you're looking for doesn't exist or may have been moved to a different location."
    },
    {
      name: "description",
      content:
        "The page you're looking for doesn't exist or may have been moved to a different location."
    }
  ];
}

export async function loader() {
  // throw to ErrorBoundary
  throw data(null, { status: 404 });
}

export default function NotFound() {
  return <NotFoundComponent />;
}
