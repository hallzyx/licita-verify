import { NextResponse } from "next/server";
import { getPublicClient } from "@/lib/arkiv/client";

type RouteParams = { params: Promise<{ entityKey: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { entityKey } = await params;

    const publicClient = getPublicClient();
    const entity = await publicClient.getEntity(entityKey as `0x${string}`);

    if (!entity) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    let payload = null;
    try {
      payload = entity.toJson();
    } catch {
      // payload not available
    }

    const attributes: Record<string, string | number> = {};
    for (const attr of entity.attributes) {
      attributes[attr.key] = attr.value;
    }

    return NextResponse.json({
      entityKey: entity.key,
      owner: entity.owner,
      creator: entity.creator,
      contentType: entity.contentType,
      createdAtBlock: entity.createdAtBlock?.toString(),
      payload,
      attributes,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("No entity"))
    ) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Error al consultar la licitación";
    return NextResponse.json(
      { error: "Error al consultar la licitación", detail: message },
      { status: 502 },
    );
  }
}
