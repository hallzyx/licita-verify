/**
 * MCP client wrapper — usando @ai-sdk/mcp oficial.
 *
 * En lugar del cliente JSON-RPC manual, usamos createMCPClient
 * con Experimental_StdioMCPTransport. Devuelve tools listas
 * para pasar directo a generateText.
 */
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let client: Awaited<ReturnType<typeof createMCPClient>> | null = null;
let toolsCache: Record<string, unknown> | null = null;

/**
 * Inicializa la conexión MCP al arrancar el bot (eager).
 * Se llama una vez desde index.ts al iniciar.
 */
export async function initMcp(): Promise<void> {
  if (client) return;

  const mcpDir = path.resolve(__dirname, "../../arkiv-mcp");

  console.log(`[mcp] connecting to Arkiv MCP server...`);

  client = await createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: "uv",
      args: ["run", "dev"],
      cwd: mcpDir,
    }),
  });

  toolsCache = await client.tools();
  console.log(`[mcp] connected — tools: ${Object.keys(toolsCache).join(", ")}`);
}

/**
 * Devuelve las tools cacheadas del MCP server.
 * Debe llamarse DESPUÉS de initMcp(). Si no se inicializó, lo hace lazy.
 */
export async function getArkivTools(): Promise<Record<string, unknown>> {
  if (!client) {
    console.warn("[mcp] getArkivTools called before initMcp — initializing lazy");
    await initMcp();
  }
  return toolsCache!;
}

/**
 * Cierra la conexión MCP. Llamar al finalizar (ej: SIGINT).
 */
export async function closeMcp(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    toolsCache = null;
    console.log("[mcp] closed");
  }
}
