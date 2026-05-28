import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPublicClient } from "@/lib/arkiv/client";

type RouteContext = {
  params: Promise<{ entityKey: string }>;
};

export async function GET(
  _request: Request,
  ctx: RouteContext,
) {
  // Verify session
  const session = await getSession();
  if (!session?.authenticated) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { entityKey } = await ctx.params;

    if (!entityKey || typeof entityKey !== "string") {
      return NextResponse.json({ error: "entityKey requerido" }, { status: 400 });
    }

    const publicClient = getPublicClient();
    const entity = await publicClient.getEntity(entityKey as `0x${string}`);

    if (!entity) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    let payload = null;
    try {
      payload = entity.toJson();
    } catch {
      // payload not available
    }

    const attrs: Record<string, string | number> = {};
    for (const attr of entity.attributes) {
      attrs[attr.key] = attr.value;
    }

    return NextResponse.json({
      entityKey: entity.key,
      owner: entity.owner,
      creator: entity.creator,
      contentType: entity.contentType,
      createdAtBlock: entity.createdAtBlock?.toString(),
      attributes: attrs,
      payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar Arkiv";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
