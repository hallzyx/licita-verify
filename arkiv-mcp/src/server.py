"""
Arkiv MCP Server — query procurement data on Arkiv blockchain.

Tools expuestos:
- arkiv_search: Buscar entidades con filtros
- arkiv_get_entity: Obtener detalle por entity key

Uso con Claude/OpenCode:
    uv run src/server.py

O instalación global:
    uv tool install . && arkiv-mcp
"""

import os
import json
from typing import Any
from dotenv import load_dotenv
import httpx
from fastmcp import FastMCP

load_dotenv()

RPC_URL = os.getenv("ARKIV_RPC_URL", "https://rpc.braga.arkiv.network")
EXPLORER_URL = os.getenv("ARKIV_EXPLORER_URL", "https://explorer.braga.arkiv.network")

mcp = FastMCP("Arkiv Explorer")

# ─── JSON-RPC helper ──────────────────────────────────────────────────


def rpc_call(method: str, params: list[Any]) -> dict[str, Any]:
    """Execute a JSON-RPC call to the Arkiv node."""
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1,
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(RPC_URL, json=payload)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"Arkiv RPC error: {data['error']}")
        return data["result"]


# ─── Tools ─────────────────────────────────────────────────────────────


@mcp.tool(
    name="arkiv_search",
    description="Buscar licitaciones públicas en Arkiv. "
    "Filtros disponibles: rubro, estado, organismo, jurisdiccion, "
    "tipoProcedimiento, montoMin, montoMax. "
    "Devuelve lista de resultados con entityKey, attributes y payload.",
)
def search_entities(
    rubro: str | None = None,
    estado: str | None = None,
    organismo: str | None = None,
    jurisdiccion: str | None = None,
    tipo_procedimiento: str | None = None,
    monto_min: float | None = None,
    monto_max: float | None = None,
    limite: int = 10,
) -> str:
    """
    Search procurement entities on Arkiv with optional filters.

    Args:
        rubro: Rubro (obra, bienes, servicios, consultoria)
        estado: Estado (convocada, evaluacion, adjudicada, etc.)
        organismo: Nombre del organismo contratante
        jurisdiccion: Provincia o jurisdiccion
        tipo_procedimiento: Tipo de procedimiento
        monto_min: Monto minimo en ARS
        monto_max: Monto maximo en ARS
        limite: Maximo de resultados (max 20)
    """
    # Build Arkiv query string
    conditions = [
        'project = "licita-verify-v1"',
        'entityType = "pliego"',
    ]

    if rubro:
        conditions.append(f'rubro = "{rubro}"')
    if estado:
        conditions.append(f'estado = "{estado}"')
    if organismo:
        conditions.append(f'organismo = "{organismo}"')
    if jurisdiccion:
        conditions.append(f'jurisdiccion = "{jurisdiccion}"')
    if tipo_procedimiento:
        conditions.append(f'tipoProcedimiento = "{tipo_procedimiento}"')
    if monto_min is not None:
        conditions.append(f"presupuestoOficial >= {monto_min}")
    if monto_max is not None:
        conditions.append(f"presupuestoOficial <= {monto_max}")

    query = " && ".join(conditions)
    limit = min(max(limite, 1), 20)

    result = rpc_call(
        "arkiv_query",
        [
            query,
            {"resultsPerPage": hex(limit)},
        ],
    )

    # Parse response
    entities = []
    for item in result.get("entities", []):
        entity = {
            "entityKey": item.get("key", ""),
            "attributes": item.get("attributes", {}),
            "payload": item.get("payload", {}),
        }
        entities.append(entity)

    if not entities:
        return "No se encontraron resultados."

    # Format output
    lines = [f"Encontré {len(entities)} resultado(s):", ""]
    for i, ent in enumerate(entities, 1):
        attrs = ent["attributes"]
        payload = ent["payload"]
        merged = {**attrs, **payload}

        objeto = str(merged.get("objeto", "-"))[:80]
        organismo = str(merged.get("organismo", "-"))
        expediente = str(merged.get("expediente", ""))
        estado_val = str(merged.get("estado", "-"))

        lines.append(f"{i}. {objeto}")
        lines.append(f"   Organismo: {organismo}")
        if expediente:
            lines.append(f"   Expediente: {expediente}")
        lines.append(f"   Estado: {estado_val}")
        lines.append(f"   Entity Key: {ent['entityKey']}")
        lines.append("")

    lines.append(f"Explorer: {EXPLORER_URL}/entity/...")
    return "\n".join(lines)


@mcp.tool(
    name="arkiv_get_entity",
    description="Obtener el detalle completo de una entidad en Arkiv "
    "por su entityKey. Devuelve attributes y payload completos.",
)
def get_entity(entity_key: str) -> str:
    """
    Get full entity details from Arkiv by entity key.

    Args:
        entity_key: Entity key en formato 0x...
    """
    result = rpc_call("arkiv_getEntity", [entity_key])

    payload = result.get("payload", {})
    attributes = result.get("attributes", {})
    merged = {**attributes, **payload}

    lines = [
        f"Entity Key: {entity_key}",
        f"Explorer: {EXPLORER_URL}/entity/{entity_key}",
        "",
    ]

    # Fields in display order
    field_order = [
        "objeto",
        "organismo",
        "expediente",
        "jurisdiccion",
        "tipoProcedimiento",
        "rubro",
        "estado",
        "presupuestoOficial",
        "fechaConvocatoria",
        "fechaApertura",
        "criterioAdjudicacion",
        "fuenteUrl",
        "documentHash",
        "documentName",
    ]
    labels = {
        "objeto": "Objeto",
        "organismo": "Organismo",
        "expediente": "Expediente",
        "jurisdiccion": "Jurisdicción",
        "tipoProcedimiento": "Tipo de procedimiento",
        "rubro": "Rubro",
        "estado": "Estado",
        "presupuestoOficial": "Presupuesto oficial",
        "fechaConvocatoria": "Fecha de convocatoria",
        "fechaApertura": "Fecha de apertura",
        "criterioAdjudicacion": "Criterio de adjudicación",
        "fuenteUrl": "Fuente URL",
        "documentHash": "Document Hash",
        "documentName": "Document Name",
    }

    for field in field_order:
        if field in merged:
            label = labels.get(field, field)
            value = merged[field]
            lines.append(f"{label}: {value}")

    # Extra fields not in the order list
    for key in merged:
        if key not in field_order:
            lines.append(f"{key}: {merged[key]}")

    return "\n".join(lines)


@mcp.tool(
    name="arkiv_raw_query",
    description="Ejecutar una consulta raw a Arkiv usando su sintaxis "
    'de búsqueda. Ej: \'rubro = "obra" && estado = "convocada"\'. '
    "Ver documentación en docs.arkiv.network/json-rpc/querying-data/",
)
def raw_query(query: str, limite: int = 10) -> str:
    """
    Execute a raw Arkiv query string.

    Args:
        query: Query string usando sintaxis Arkiv
               (operadores: =, !=, <, >, <=, >=, ~, &&, ||, !)
        limite: Maximo de resultados (max 20)
    """
    limit = min(max(limite, 1), 20)
    result = rpc_call(
        "arkiv_query",
        [
            query,
            {"resultsPerPage": hex(limit)},
        ],
    )

    entities = []
    for item in result.get("entities", []):
        entities.append(
            {
                "entityKey": item.get("key", ""),
                "attributes": item.get("attributes", {}),
                "payload": item.get("payload", {}),
            }
        )

    if not entities:
        return "No se encontraron resultados."

    lines = [f"Query ejecutada: {query}", f"Resultados: {len(entities)}", ""]
    for i, ent in enumerate(entities, 1):
        attrs = ent["attributes"]
        payload = ent["payload"]
        merged = {**attrs, **payload}
        objeto = str(merged.get("objeto", "-"))[:80]
        lines.append(f"{i}. {objeto}")
        lines.append(f"   Entity Key: {ent['entityKey']}")
        lines.append("")

    return "\n".join(lines)


# ─── Main ──────────────────────────────────────────────────────────────


def main() -> None:
    """Entrypoint for the MCP server."""
    mcp.run()


if __name__ == "__main__":
    main()
