import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getPublicClient, PROJECT_ATTRIBUTE, getAdminAddress } from "@/lib/arkiv/client";
import { eq } from "@arkiv-network/sdk/query";

export async function GET(request: NextRequest) {
  // Verify session
  const session = await getSession();
  if (!session?.authenticated) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const publicClient = getPublicClient();
    const adminAddress = getAdminAddress();

    const query = publicClient
      .buildQuery()
      .where(eq("project", PROJECT_ATTRIBUTE.value))
      .where(eq("entityType", "pliego"))
      .createdBy(adminAddress)
      .withPayload(true)
      .withAttributes(true)
      .limit(limit);

    if (cursor) {
      query.cursor(cursor);
    }

    const result = await query.fetch();

    const entities = result.entities.map((entity) => {
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

      return {
        entityKey: entity.key,
        owner: entity.owner,
        creator: entity.creator,
        createdAtBlock: entity.createdAtBlock?.toString(),
        attributes: attrs,
        payload,
      };
    });

    return NextResponse.json({
      entities,
      cursor: result.hasNextPage() ? result.cursor : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar Arkiv";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
