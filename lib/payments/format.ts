/** Formatting helpers for money, assets and Stellar identifiers. */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGbp(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return GBP.format(Number.isFinite(value) ? value : 0);
}

/** Compact GBP for dashboard tiles: £8,420.00 -> £8,420 when whole. */
export function formatGbpCompact(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return GBP.format(0);
  return Number.isInteger(value) ? GBP.format(value).replace('.00', '') : GBP.format(value);
}

/** Trim trailing zeros from a Stellar amount, keeping at least 2 decimals. */
export function formatAssetAmount(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return '0.00';
  const fixed = value.toFixed(7).replace(/(\.\d{2}\d*?)0+$/, '$1');
  return fixed.endsWith('.') ? `${fixed}00` : fixed;
}

export function formatAsset(
  amount: number | string | null | undefined,
  assetCode: string | null | undefined,
): string {
  return `${formatAssetAmount(amount)} ${assetCode ?? 'XLM'}`;
}

export function shortenHash(hash: string | null | undefined, size = 6): string {
  if (!hash) return '—';
  if (hash.length <= size * 2 + 3) return hash;
  return `${hash.slice(0, size)}…${hash.slice(-size)}`;
}

export function shortenAddress(address: string | null | undefined): string {
  if (!address) return '—';
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** mm:ss countdown from a number of seconds. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function secondsUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.round((target - Date.now()) / 1000));
}
