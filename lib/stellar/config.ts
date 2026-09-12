/**
 * Stellar network configuration. Testnet only — this MVP never touches mainnet.
 */

export const STELLAR_NETWORK = 'TESTNET' as const;

/** SEP-0043 network passphrase for the Stellar test network. */
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

export const HORIZON_URL =
  process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

export const SOROBAN_RPC_URL =
  process.env.EXPO_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';

export const FRIENDBOT_URL = 'https://friendbot.stellar.org';

/** Optional deployed Soroban contract id. Empty until the contract is deployed. */
export const SOROBAN_CONTRACT_ID = process.env.EXPO_PUBLIC_STELLAR_CONTRACT_ID ?? '';

/** Base reserve headroom kept aside when checking a native XLM balance. */
export const XLM_RESERVE_HEADROOM = 1.6;

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerAccountUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

export function isStellarAddress(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^G[A-Z2-7]{55}$/.test(value.trim());
}
