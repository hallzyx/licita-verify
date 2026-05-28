import { createWalletClient, createPublicClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value || value === "0x" + "0".repeat(64)) {
    throw new Error(`Missing env: ${key}. Set it in .env.local`);
  }
  return value;
}

/**
 * Server-only WalletClient for writing entities to Arkiv.
 * Uses the admin private key from env.
 */
export function getAdminWalletClient() {
  const privateKey = getEnvOrThrow("ARKIV_ADMIN_PRIVATE_KEY") as `0x${string}`;
  return createWalletClient({
    chain: braga,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  });
}

/**
 * Read-only PublicClient for querying Arkiv entities.
 * Safe for server-side use.
 */
export function getPublicClient() {
  return createPublicClient({
    chain: braga,
    transport: http(),
  });
}

/** Unique project attribute to isolate LicitaVerify data in Arkiv's shared DB */
export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "licita-verify-v1",
} as const;

/** The admin wallet address (creator filter for trusted data) */
export function getAdminAddress() {
  const privateKey = getEnvOrThrow("ARKIV_ADMIN_PRIVATE_KEY") as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  return account.address;
}
