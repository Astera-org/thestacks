// Serves the JSON recorded by record-publication.ts by request path, so the
// frontend's server render can use it as its backend (VITE_BACKEND_URL).
// Usage: node visual/fixture-server.ts <port>   (query strings are ignored)
import { readFileSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { recordedFile } from "./recordings.ts";

// Loopback only, as an IP: "localhost" can resolve to ::1 first.
const HOST = "127.0.0.1";
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error("Usage: node visual/fixture-server.ts <port>");
}

function reply(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(body);
}

createServer((request, response) => {
  let pathname: string;
  try {
    pathname = new URL(request.url ?? "/", "http://fixtures").pathname;
  } catch {
    console.error(`fixture-server: malformed target ${request.url}`);
    return reply(response, 400, '{"error":"malformed request target"}');
  }
  try {
    const file = request.method === "GET" ? recordedFile(pathname) : null;
    if (!file) {
      console.error(
        `fixture-server: no recording for ${request.method} ${pathname}`,
      );
      return reply(response, 404, '{"error":"not recorded"}');
    }
    reply(response, 200, readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`fixture-server: failed on ${pathname}:`, error);
    reply(response, 500, '{"error":"could not read recording"}');
  }
}).listen(port, HOST, () => {
  console.log(`fixture-server: listening on http://${HOST}:${port}`);
});
