/**
 * Arkiv query tools — vía @ai-sdk/mcp (oficial).
 *
 * Las tools se obtienen del MCP server Python (arkiv-mcp/).
 * Compatibles directo con generateText().
 *
 * ═══════════════════════════════════════════════════════════
 * Correr:
 *   Terminal 1: cd arkiv-mcp && uv run src/server.py
 *   Terminal 2: cd agent && npm run agent
 *
 * O automático: el MCP client spawns el server a demanda.
 * ═══════════════════════════════════════════════════════════
 */
import { getArkivTools } from "./mcp-client";

/**
 * Tools de Arkiv obtenidas del MCP server.
 * Se cachean después de la primera llamada.
 */
export async function getTools(): Promise<Record<string, unknown>> {
  return getArkivTools();
}
