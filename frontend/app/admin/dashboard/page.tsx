import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";
import { getPublicClient, PROJECT_ATTRIBUTE, getAdminAddress, withRetry } from "@/lib/arkiv/client";
import { eq } from "@arkiv-network/sdk/query";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.authenticated) {
    redirect("/admin/login");
  }

  let entities: Array<{
    entityKey: string;
    attributes: Record<string, string | number>;
    payload: Record<string, unknown> | null;
  }> = [];
  let error: string | null = null;

  try {
    const publicClient = getPublicClient();
    const adminAddress = getAdminAddress();

    const result = await withRetry(() =>
      publicClient
        .buildQuery()
        .where(eq("project", PROJECT_ATTRIBUTE.value))
        .where(eq("entityType", "pliego"))
        .createdBy(adminAddress)
        .withPayload(true)
        .withAttributes(true)
        .limit(50)
        .fetch()
    );

    entities = result.entities.map((entity) => {
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
        attributes: attrs,
        payload,
      };
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar licitaciones";
  }

  return (
    <DashboardClient entities={entities} error={error} />
  );
}
