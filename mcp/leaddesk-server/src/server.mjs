// LeadDesk MCP server over stdio: the entry Claude Code and MCP Inspector start.
// stdout is the protocol channel, so nothing under src/ prints to it; logs go to stderr only.
//
//   node mcp/leaddesk-server/src/server.mjs                                  fixture next to the server
//   LEADDESK_FIXTURE=/path/to/leads.json node mcp/leaddesk-server/src/server.mjs   another fixture
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { factory } from "./leaddesk.mjs";

await serveStdio(factory);
