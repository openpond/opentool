import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { fileURLToPath } from "url";
import { createMcpAdapter } from "../adapters/mcp";
import {
  HTTP_METHODS,
  type HttpHandlerDefinition,
  type InternalToolDefinition,
} from "../types/index";
import { loadAndValidateTools } from "./validate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
);

const cyan = "\x1b[36m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

export interface DevOptions {
  input: string;
  port?: number;
  watch?: boolean;
  stdio?: boolean;
}

export async function devCommand(options: DevOptions): Promise<void> {
  const port = options.port ?? 7000;
  const watch = options.watch ?? true;
  const enableStdio = options.stdio ?? false;
  const log = enableStdio
    ? (_message: string) => {}
    : (message: string) => console.log(message);

  try {
    const toolsDir = path.resolve(options.input);
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }

    const projectRoot = path.dirname(toolsDir);
    let toolDefinitions = await loadToolDefinitions(toolsDir, projectRoot);
    if (toolDefinitions.length === 0) {
      throw new Error("No tools found in the target directory");
    }
    let routes = expandRoutes(toolDefinitions);

    const stdioController = enableStdio
      ? await startMcpServer(() => toolDefinitions)
      : null;

    if (watch) {
      fs.watch(toolsDir, async (_eventType, filename) => {
        if (filename && !/\.(ts|js|mjs|cjs|tsx|jsx)$/.test(filename)) {
          return;
        }
        log(
          `${dim}\nDetected change in ${
            filename ?? "tools directory"
          }, reloading...${reset}`
        );
        try {
          toolDefinitions = await loadToolDefinitions(toolsDir, projectRoot);
          routes = expandRoutes(toolDefinitions);
          logReload(toolDefinitions, enableStdio, log);
        } catch (error) {
          console.error("Failed to reload tools:", error);
        }
      });
    }

  const server = http.createServer(async (req, res) => {
    const method = (req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const routePath = url.pathname;
    log(`${dim}[request] ${method} ${routePath}${reset}`);
    try {
      await handleRequest({ req, res, port, routes });
      log(`${dim}[response] ${method} ${routePath} ${res.statusCode}${reset}`);
    } catch (error) {
      console.error("Error handling request:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (error as Error).message }));
      log(`${dim}[response] ${method} ${routePath} 500${reset}`);
    }
  });

  server.listen(port, () => {
    log(`${bold}${dim}> dev opentool${reset}`);
    log(
      `   * ${bold}opentool${reset} ${cyan}v${packageJson.version}${reset}`
    );
    log(`   * ${bold}HTTP:${reset} http://localhost:${port}`);
    logStartup(toolDefinitions, enableStdio, log);
  });

  process.on("SIGINT", async () => {
    log(`\n${dim}Shutting down dev server...${reset}`);
    server.close();
    if (stdioController) {
      await stdioController.close();
    }
    process.exit(0);
  });
  } catch (error) {
    console.error("Dev server failed:", error);
    process.exit(1);
  }
}

async function startMcpServer(
  getTools: () => InternalToolDefinition[]
): Promise<{ close(): Promise<void> }> {
  const server = new Server(
    {
      name: "opentool-dev",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getTools().filter(isMcpEnabled);
    return {
      tools: tools.map((tool) => ({
        name: tool.metadata?.name ?? tool.filename,
        description: tool.metadata?.description ?? `${tool.filename} tool`,
        inputSchema: tool.inputSchema,
        annotations: tool.metadata?.annotations,
        payment: tool.metadata?.payment,
        discovery: tool.metadata?.discovery,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tools = getTools().filter(isMcpEnabled);
    const tool = tools.find((entry) => {
      const toolName = entry.metadata?.name ?? entry.filename;
      return toolName === request.params.name;
    });

    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    try {
      const validatedParams = (tool.schema as any).parse(
        request.params.arguments
      );
      const handler =
        tool.handler ??
        createMcpAdapter({
          name: tool.metadata?.name ?? tool.filename,
          httpHandlers: toHttpHandlerMap(tool.httpHandlers),
          ...(tool.schema ? { schema: tool.schema } : {}),
          ...(tool.legacyTool ? { legacyTool: tool.legacyTool } : {}),
          ...(tool.mcpConfig?.defaultMethod
            ? { defaultMethod: tool.mcpConfig.defaultMethod }
            : {}),
        });

      const result = await handler(validatedParams);
      return result as any;
    } catch (error) {
      const message = (error && (error as Error).message) || String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      } as any;
    }
  });

  const transport = new StdioServerTransport();
  server.connect(transport).catch((error) => {
    console.error("MCP transport error:", error);
  });

  return {
    async close() {
      await server.close();
      if (typeof transport.close === "function") {
        transport.close();
      }
    },
  };
}

async function loadToolDefinitions(
  toolsDir: string,
  projectRoot: string
): Promise<InternalToolDefinition[]> {
  return loadAndValidateTools(toolsDir, { projectRoot });
}

function expandRoutes(tools: InternalToolDefinition[]): DevRoute[] {
  const routes: DevRoute[] = [];

  tools.forEach((tool) => {
    tool.httpHandlers.forEach((handlerDef: HttpHandlerDefinition) => {
      routes.push({
        tool,
        method: handlerDef.method.toUpperCase(),
        handler: async (request: Request) => handlerDef.handler(request),
      });
    });
  });

  return routes;
}

function logStartup(
  tools: InternalToolDefinition[],
  stdio: boolean,
  log: (message: string) => void
): void {
  log(`\nTools: ${tools.length} tool${tools.length === 1 ? "" : "s"}`);
  printToolList(tools, log);
  if (stdio) {
    const mcpTools = tools.filter(isMcpEnabled);
    const label =
      mcpTools.length > 0
        ? `MCP stdio enabled (${mcpTools.length} tool${
            mcpTools.length === 1 ? "" : "s"
          })`
        : "MCP stdio enabled (no tools opted in)";
    log(`${dim}${label}${reset}`);
  }
}

function logReload(
  tools: InternalToolDefinition[],
  stdio: boolean,
  log: (message: string) => void
): void {
  log(`\nReloaded ${tools.length} tool${tools.length === 1 ? "" : "s"}`);
  printToolList(tools, log);
  if (stdio) {
    const mcpTools = tools.filter(isMcpEnabled);
    const label =
      mcpTools.length > 0
        ? `MCP stdio enabled (${mcpTools.length} tool${
            mcpTools.length === 1 ? "" : "s"
          })`
        : "MCP stdio enabled (no tools opted in)";
    log(`${dim}${label}${reset}`);
  }
}

function printToolList(
  tools: InternalToolDefinition[],
  log: (message: string) => void
): void {
  tools.forEach((tool) => {
    const name = tool.metadata?.name ?? tool.filename;
    const methods = tool.httpHandlers
      .map((handler) => handler.method)
      .join(", ");
    const mcpTag =
      tool.mcpConfig?.enabled || tool.legacyTool ? `${dim}[mcp]${reset}` : "";
    log(`  • ${name} — ${methods}${mcpTag ? ` ${mcpTag}` : ""}`);
  });
}

async function handleRequest(params: {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  port: number;
  routes: DevRoute[];
}): Promise<void> {
  const { req, res, port, routes } = params;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    HTTP_METHODS.join(", ") + ", OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const method = (req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const toolName = url.pathname.slice(1) || "index";

  const route = findRoute(toolName, method, routes);
  if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: `Tool not found: ${method} /${toolName}`,
        availableTools: routes.map((r) => `${r.method} /${routeName(r.tool)}`),
      })
    );
    return;
  }

  const body = await readRequestBody(req);
  const request = createWebRequest({ req, url, body });
  const response = await route.handler(request);

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  res.writeHead(response.status, headers);

  if (method === "HEAD") {
    res.end();
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}

function findRoute(
  toolName: string,
  method: string,
  routes: DevRoute[]
): DevRoute | undefined {
  const direct = routes.find(
    (route) => routeName(route.tool) === toolName && route.method === method
  );

  if (direct) {
    return direct;
  }

  if (method === "HEAD") {
    return routes.find(
      (route) => routeName(route.tool) === toolName && route.method === "GET"
    );
  }

  return undefined;
}

function routeName(tool: InternalToolDefinition): string {
  return tool.metadata?.name ?? tool.filename;
}

async function readRequestBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function createWebRequest(params: {
  req: http.IncomingMessage;
  url: URL;
  body: Buffer;
}): Request {
  const { req, url, body } = params;

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      return;
    }
    headers.set(key, value);
  });

  const method = (req.method || "GET").toUpperCase();
  const init: RequestInit = {
    method,
    headers,
  };

  if (body.length > 0 && method !== "GET" && method !== "HEAD") {
    init.body = body;
  }

  return new Request(url, init);
}

interface DevRoute {
  tool: InternalToolDefinition;
  method: string;
  handler: (request: Request) => Promise<Response>;
}

function toHttpHandlerMap(
  handlers: HttpHandlerDefinition[]
): Record<string, HttpHandlerDefinition["handler"]> {
  return handlers.reduce<Record<string, HttpHandlerDefinition["handler"]>>(
    (acc, handler) => {
      acc[handler.method.toUpperCase()] = handler.handler;
      return acc;
    },
    {}
  );
}

function isMcpEnabled(tool: InternalToolDefinition): boolean {
  return Boolean(tool.mcpConfig?.enabled || tool.legacyTool);
}
