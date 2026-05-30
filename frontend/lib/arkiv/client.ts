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
 * Retry an async operation with backoff on transient Arkiv RPC errors.
 * Catches "context cancelled" timeouts and retries up to `maxRetries` times.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Arkiv node sometimes returns "context cancelled" on broad queries
      if (msg.includes("context cancelled") || msg.includes("timeout")) {
        lastError = e;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }
      throw e;
    }
  }
  throw lastError;
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
