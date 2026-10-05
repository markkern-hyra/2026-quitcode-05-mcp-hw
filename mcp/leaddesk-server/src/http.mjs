// LeadDesk MCP server over Streamable HTTP (bonus E1): the same factory as server.mjs, served on
// http://127.0.0.1:3333/mcp for clients that cannot start a stdio process.
//
//   node mcp/leaddesk-server/src/http.mjs
//
// The Host and Origin guards are called by hand in the request handler, before the MCP handler sees
// the request: toNodeHandler has no option for them, and an unknown option is silently ignored.
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

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  if (new URL(req.url ?? "/", "http://localhost").pathname !== "/mcp") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found: the MCP endpoint is /mcp\n");
    return;
  }
  await mcp(req, res);
}).listen(PORT, HOST, () => console.error(`leaddesk MCP over HTTP: http://${HOST}:${PORT}/mcp`));
