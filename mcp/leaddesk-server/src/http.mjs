// LeadDesk MCP server over Streamable HTTP (bonus E1): the same factory as server.mjs, served on
// http://127.0.0.1:3333/mcp for clients that cannot start a stdio process.
//
//   node mcp/leaddesk-server/src/http.mjs
//
// The Host and Origin guards are called by hand in the request handler, before the MCP handler sees
// the request: per the workshop walkthrough, passing them as a toNodeHandler option is silently ignored.
// Host blocks DNS rebinding (a page on evil.example resolving to 127.0.0.1); Origin blocks a browser
// page on another site posting to the server. There is no authentication: any local process can call
// both tools, including the status change. Keep it on 127.0.0.1 and never expose the port.
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { factory } from "./leaddesk.mjs";

const HOST = "127.0.0.1";
const PORT = 3333;

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

const httpServer = createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  try {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found: the MCP endpoint is /mcp\n");
      return;
    }
    await mcp(req, res);
  } catch (error) {
    // One bad request must not take the process down; the message carries no request data.
    console.error(`leaddesk MCP over HTTP: request failed: ${error.message}`);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Internal error\n");
    else res.end();
  }
}).listen(PORT, HOST, () => console.error(`leaddesk MCP over HTTP: http://${HOST}:${PORT}/mcp`));

// Ctrl+C or a kill: stop taking connections and let in-flight requests finish; an open stream can keep
// close() waiting forever, so after 5 s the remaining connections are cut.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => {
      httpServer.closeAllConnections();
      process.exit(0);
    }, 5000).unref();
  });
}
