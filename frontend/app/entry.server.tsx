import { mediaType } from "@hapi/accept";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { PassThrough } from "node:stream";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { getMaintenanceHtml } from "./server/maintenance.server";

export const streamTimeout = 5_000;

const TEXT_HTML = "text/html";
const TEXT_MD = "text/markdown";
const APP_JSON = "application/json";
const API_PUB_ACCEPT_HEADERS: string[] = [TEXT_MD, APP_JSON];

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }

  const url = new URL(request.url);
  const acceptHeader = request.headers.get("Accept") || "";

  const pubMatch = url.pathname.match(
    /^\/publications\/([a-zA-Z0-9_-]+)(\/v\d+)?(\.md|\.json)?$/
  );
  if (pubMatch && ["GET", "HEAD"].includes(request.method.toUpperCase())) {
    const slug = pubMatch[1];
    const version = pubMatch[2];
    const ext = pubMatch[3];

    const bestAcceptType = mediaType(acceptHeader, [
      TEXT_HTML,
      ...API_PUB_ACCEPT_HEADERS
    ]);

    // If markdown is preferred over HTML, proxy to API
    if (
      API_PUB_ACCEPT_HEADERS.includes(bestAcceptType) ||
      ext === ".md" ||
      ext === ".json"
    ) {
      try {
        const acceptType =
          ext === ".md" ? TEXT_MD : ext === ".json" ? APP_JSON : bestAcceptType;
        const apiUrl = `${process.env.VITE_BACKEND_URL}/api`;
        const apiResponse = await fetch(
          `${apiUrl}/publications/${slug}${version ?? ""}`,
          {
            method: request.method,
            headers: { Accept: acceptType }
          }
        );

        const upstreamHeaders = apiResponse.headers;
        const contentType =
          upstreamHeaders.get("Content-Type") ?? `${acceptType}; charset=utf-8`;
        const cacheControl =
          upstreamHeaders.get("Cache-Control") ?? "public, max-age=3600";
        const upstreamVary = upstreamHeaders.get("Vary");
        const vary = [
          ...(upstreamVary && upstreamVary.length > 0 ? [upstreamVary] : []),
          // Only include the Vary header if the extension is not specified, to
          // indicate that the response may vary based on the Accept header.
          ...(!ext && !(upstreamVary ?? "").match(/\bAccept\b/)
            ? ["Accept"]
            : [])
        ].join(", ");
        if (request.method.toUpperCase() === "HEAD") {
          return new Response(null, {
            status: apiResponse.status,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": cacheControl,
              Vary: vary
            }
          });
        }

        return new Response(apiResponse.body, {
          status: apiResponse.status,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": cacheControl,
            Vary: vary
          }
        });
      } catch (error) {
        console.error("Error fetching publication:", error);
        return new Response("Error", { status: 500 });
      }
    }

    // Otherwise render HTML via React Router (fetch JSON from API as needed)
  }

  if (process.env.MAINTENANCE_ACTIVE === "true") {
    const html = await getMaintenanceHtml();
    const headers = new Headers(responseHeaders);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Retry-After", "600");

    return new Response(request.method.toUpperCase() === "HEAD" ? null : html, {
      status: 503,
      headers
    });
  }

  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000
    );

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              // Clear the timeout to prevent retaining the closure and memory leak
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", TEXT_HTML);

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
