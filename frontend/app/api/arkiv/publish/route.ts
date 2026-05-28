import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { licitacionSchema, toMachineValues } from "@/lib/validacion";
import { getAdminWalletClient } from "@/lib/arkiv/client";
import { buildPliegoEntity } from "@/lib/arkiv/entities";
import { EntityMutationError } from "@arkiv-network/sdk";

export async function POST(request: Request) {
  // Verify session (defense in depth — proxy also guards)
  const session = await getSession();
  if (!session?.authenticated) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = licitacionSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json({ error: "Datos inválidos", details }, { status: 422 });
    }

    // Map display values → machine values for on-chain consistency
    const machineData = toMachineValues(parsed.data);
    const entityParams = buildPliegoEntity(machineData);
    const walletClient = getAdminWalletClient();
    const { entityKey, txHash } = await walletClient.createEntity(entityParams);

    return NextResponse.json({ entityKey, txHash }, { status: 201 });
  } catch (error) {
    // Arkiv SDK transaction errors
    if (error instanceof EntityMutationError) {
      const msg = error.message.toLowerCase();
      if (msg.includes("insufficient funds")) {
        return NextResponse.json(
          {
            error: "Fondos insuficientes. Solicite GLM en el faucet de Braga.",
            faucetUrl: "https://faucet.braga.arkiv.network",
          },
          { status: 402 },
        );
      }
      if (msg.includes("reverted")) {
        return NextResponse.json(
          { error: "Datos inválidos", details: [{ field: "general", message: error.message }] },
          { status: 422 },
        );
      }
    }

    // RPC / network errors
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("connect") ||
      message.includes("ECONNREFUSED") ||
      message.includes("timeout")
    ) {
      return NextResponse.json(
        { error: "El nodo Arkiv no está disponible. Intente más tarde." },
        { status: 502 },
      );
    }

    // Generic unexpected error
    const fallbackMessage =
      error instanceof Error ? error.message : "Error al publicar en Arkiv";
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}
