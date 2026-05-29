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
import re
import sys
from typing import Any
from dotenv import load_dotenv
import httpx
from fastmcp import FastMCP

load_dotenv()

RPC_URL = os.getenv("ARKIV_RPC_URL", "https://braga.hoodi.arkiv.network/rpc")
EXPLORER_URL = os.getenv("ARKIV_EXPLORER_URL", "https://data.arkiv.network")

mcp = FastMCP("Arkiv Explorer")

# ─── Helpers ───────────────────────────────────────────────────────────


def _sanitize_arkiv_query(query: str) -> str:
    """
    Sanitiza una query string de Arkiv:
    - Arkiv NO acepta floats, solo enteros. Removemos '.0' de números.
      Ej: '>= 1000000.0' → '>= 1000000'
    """
    return re.sub(r"(\d+)\.0\b", r"\1", query)


def rpc_call(method: str, params: list[Any], retry: bool = True) -> dict[str, Any]:
    """Execute a JSON-RPC call to the Arkiv node.

    Sanitiza automáticamente queries arkiv_query para remover floats.
    Reintenta una vez si Arkiv responde con 'context cancelled' (timeout).
    """
    # Sanitize arkiv_query params (defense in depth contra floats)
    if method == "arkiv_query" and params and isinstance(params[0], str):
        params[0] = _sanitize_arkiv_query(params[0])

    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1,
    }
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(RPC_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                err_msg = str(data["error"])
                # Reintentar una vez si es timeout del nodo
                if retry and "context cancelled" in err_msg:
                    import time as _time

                    _time.sleep(1)
                    return rpc_call(method, params, retry=False)
                raise RuntimeError(f"Arkiv RPC error: {data['error']}")
            return data["result"]
    except httpx.TimeoutException:
        if retry:
            import time as _time

            _time.sleep(1)
            return rpc_call(method, params, retry=False)
        raise RuntimeError(
            "La consulta tardó demasiado. Probá con filtros más específicos."
        )


# ─── Tools ─────────────────────────────────────────────────────────────


@mcp.tool(
    name="arkiv_search",
    description="Buscar licitaciones públicas en Arkiv. "
    "Filtros: rubro, estado, organismo, jurisdiccion, "
    "tipoProcedimiento, montoMin, montoMax. "
    "Usá SOLO estos nombres exactos. "
    "Devuelve lista con entityKey, attributes y payload.",
)
def search_entities(
    rubro: str | None = None,
    estado: str | None = None,
    organismo: str | None = None,
    jurisdiccion: str | None = None,
    tipoProcedimiento: str | None = None,
    montoMin: float | None = None,
    montoMax: float | None = None,
    limite: int = 10,
) -> str:
    """
    Search procurement entities on Arkiv with optional filters.

    Args:
        rubro: Rubro (obra, bienes, servicios, consultoria)
        estado: Estado (convocada, evaluacion, adjudicada, etc.)
        organismo: Nombre del organismo contratante
        jurisdiccion: Provincia o jurisdiccion
        tipoProcedimiento: Tipo de procedimiento
        montoMin: Monto minimo en ARS (se aplica como presupuestoOficial >= valor)
        montoMax: Monto maximo en ARS (se aplica como presupuestoOficial <= valor)
        limite: Maximo de resultados (max 20)
    """
    _active = {}
    if rubro:
        _active["rubro"] = rubro
    if estado:
        _active["estado"] = estado
    if organismo:
        _active["organismo"] = organismo
    if jurisdiccion:
        _active["jurisdiccion"] = jurisdiccion
    if tipoProcedimiento:
        _active["tipoProcedimiento"] = tipoProcedimiento
    if montoMin is not None:
        _active["montoMin"] = montoMin
    if montoMax is not None:
        _active["montoMax"] = montoMax
    print(f"[mcp] arkiv_search filters={_active}", file=sys.stderr)
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
    if tipoProcedimiento:
        conditions.append(f'tipoProcedimiento = "{tipoProcedimiento}"')
    if montoMin is not None:
        conditions.append(f"presupuestoOficial >= {int(montoMin)}")
    if montoMax is not None:
        conditions.append(f"presupuestoOficial <= {int(montoMax)}")

    query = " && ".join(conditions)
    limit = min(max(limite, 1), 20)

    print(f"[mcp] arkiv_query: {query}", file=sys.stderr)

    try:
        result = rpc_call(
            "arkiv_query",
            [
                query,
                {"resultsPerPage": hex(limit)},
            ],
        )
    except RuntimeError as e:
        return f"Error al buscar: {e}. Probá con filtros más específicos (rubro, estado, etc.)."

    # Parse response
    entities = []
    for item in result.get("data", []):
        # Parse stringAttributes and numericAttributes into a flat dict
        attrs = {}
        for attr in item.get("stringAttributes", []):
            attrs[attr["key"]] = attr["value"]
        for attr in item.get("numericAttributes", []):
            attrs[attr["key"]] = attr["value"]

        # Decode payload from hex
        payload = {}
        value_hex = item.get("value", "")
        if value_hex and value_hex.startswith("0x"):
            try:
                payload_bytes = bytes.fromhex(value_hex[2:])
                payload = json.loads(payload_bytes.decode("utf-8"))
            except (ValueError, json.JSONDecodeError):
                pass

        entity = {
            "entityKey": item.get("key", ""),
            "attributes": attrs,
            "payload": payload,
        }
        entities.append(entity)

    if not entities:
        return "No se encontraron resultados."

    # Format output — show ALL available fields
    lines = [f"Encontré {len(entities)} resultado(s):", ""]
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
    ]
    labels = {
        "objeto": "Objeto",
        "organismo": "Organismo",
        "expediente": "Expediente",
        "jurisdiccion": "Jurisdicción",
        "tipoProcedimiento": "Tipo",
        "rubro": "Rubro",
        "estado": "Estado",
        "presupuestoOficial": "Presupuesto",
        "fechaConvocatoria": "Conv.",
        "fechaApertura": "Apertura",
        "criterioAdjudicacion": "Criterio",
        "fuenteUrl": "Fuente",
    }
    for i, ent in enumerate(entities, 1):
        merged = {**ent["attributes"], **ent["payload"]}
        lines.append(f"*{i}. {str(merged.get('objeto', '-'))[:80]}*")
        for field in field_order:
            val = merged.get(field)
            if val and field != "objeto":
                label = labels.get(field, field)
                val_str = str(val)[:120]
                lines.append(f"   _{label}_: {val_str}")
        lines.append(f"   Entity Key: {ent['entityKey']}")
        lines.append("")

    return "\n".join(lines)


# NOTA: arkiv_getEntity NO está whitelisted en el RPC público.
# Usamos arkiv_query con $key (synthetic attribute) como workaround.
@mcp.tool(
    name="arkiv_get_entity",
    description="Obtener el detalle completo de una licitación por su "
    "entityKey (hash 0x...). Devuelve todos los atributos y payload.",
)
def get_entity(entity_key: str) -> str:
    """
    Get full entity details from Arkiv by entity key via arkiv_query.

    Args:
        entity_key: Entity key en formato 0x...
    """
    print(f"[mcp] arkiv_get_entity key={entity_key}", file=sys.stderr)
    query = f'$key = "{entity_key}"'
    try:
        result = rpc_call("arkiv_query", [query, None])
    except RuntimeError as e:
        return f"Error al obtener entidad: {e}"

    data = result.get("data", [])
    if not data:
        return f"No se encontró la entidad {entity_key} (puede haber expirado)."
    item = data[0]

    # Parse stringAttributes and numericAttributes into a flat dict
    attrs = {}
    for attr in item.get("stringAttributes", []):
        attrs[attr["key"]] = attr["value"]
    for attr in item.get("numericAttributes", []):
        attrs[attr["key"]] = attr["value"]

    # Decode payload from hex
    payload = {}
    value_hex = item.get("value", "")
    if value_hex and value_hex.startswith("0x"):
        try:
            payload_bytes = bytes.fromhex(value_hex[2:])
            payload = json.loads(payload_bytes.decode("utf-8"))
        except (ValueError, json.JSONDecodeError):
            pass

    merged = {**attrs, **payload}

    lines = [
        f"Entity Key: {entity_key}",
        f"Ver en Arkiv: https://data.arkiv.network/entity/{entity_key}",
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


# NOTA: arkiv_raw_query fue eliminada como tool expuesta porque el LLM
# construía queries con floats (ej: presupuestoOficial >= 1000000.0) que
# Arkiv no acepta. Usar arkiv_search con filtros estructurados en su lugar.
# La función se mantiene como internal para debugging.
def _raw_query(query: str, limite: int = 10) -> str:
    """(internal) Execute a raw Arkiv query string."""
    print(f"[mcp] _raw_query query={query[:100]}...", file=sys.stderr)
    limit = min(max(limite, 1), 20)
    result = rpc_call(
        "arkiv_query",
        [
            query,
            {"resultsPerPage": hex(limit)},
        ],
    )

    entities = []
    for item in result.get("data", []):
        # Parse stringAttributes and numericAttributes into a flat dict
        attrs = {}
        for attr in item.get("stringAttributes", []):
            attrs[attr["key"]] = attr["value"]
        for attr in item.get("numericAttributes", []):
            attrs[attr["key"]] = attr["value"]

        # Decode payload from hex
        payload = {}
        value_hex = item.get("value", "")
        if value_hex and value_hex.startswith("0x"):
            try:
                payload_bytes = bytes.fromhex(value_hex[2:])
                payload = json.loads(payload_bytes.decode("utf-8"))
            except (ValueError, json.JSONDecodeError):
                pass

        entities.append(
            {
                "entityKey": item.get("key", ""),
                "attributes": attrs,
                "payload": payload,
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
