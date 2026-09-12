import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Spinner, Text } from 'heroui-native';

import { DetailRow } from '@/components/DetailRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PosTenderCard } from '@/components/PosTenderCard';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { StatusPill } from '@/components/StatusPill';
import { fetchTransactionById, type TransactionWithSession } from '@/lib/payments/api';
import { bpsToPercent, formatPercent } from '@/lib/payments/fees';
import { formatAsset, formatDateTime, formatGbp, shortenAddress } from '@/lib/payments/format';
import { explorerTxUrl } from '@/lib/stellar/config';
import { toPaymentError } from '@/lib/stellar/errors';
import { useMerchantStore } from '@/lib/store/merchant';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const merchant = useMerchantStore((s) => s.merchant);
  const [row, setRow] = useState<TransactionWithSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchTransactionById(id);
        if (!cancelled) setRow(data);
      } catch (cause) {
        if (!cancelled) setError(toPaymentError(cause).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const openExplorer = () => {
    if (!row) return;
    const url = explorerTxUrl(row.stellar_transaction_hash);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
      return;
    }
    void Linking.openURL(url);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Spinner />
      </View>
    );
  }

  if (!row) {
    return (
      <Screen>
        <ErrorNotice
          title="Transaction not found"
          message={error ?? 'This transaction no longer exists.'}
        />
        <Button onPress={() => router.replace('/transactions')}>
          <Button.Label>Back to transactions</Button.Label>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-5">
      <View className="gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <StatusPill status="settled" label="SETTLED" />
        <Text.Heading type="h1" className="text-neutral-900 tabular-nums">
          {formatGbp(row.amount_gbp)}
        </Text.Heading>
        <Text.Paragraph className="text-neutral-600">
          {row.payment_sessions?.order_reference
            ? `Order ${row.payment_sessions.order_reference}`
            : 'No order reference'}
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-500">
          {formatDateTime(row.created_at)}
        </Text.Paragraph>
      </View>

      <SectionCard title="Settlement split">
        <DetailRow
          label="Merchant receives"
          value={formatAsset(row.merchant_amount, row.asset_code)}
          emphasis
        />
        <DetailRow
          label={`Platform fee (${formatPercent(bpsToPercent(row.platform_fee_bps))})`}
          value={formatAsset(row.platform_fee, row.asset_code)}
        />
        <DetailRow label="Gross settlement" value={formatAsset(row.gross_amount, row.asset_code)} />
        <DetailRow label="Settlement asset" value={row.asset_code} />
        <DetailRow label="Mode" value={row.settlement_mode.replace('_', ' ')} />
      </SectionCard>

      <SectionCard title="Stellar Testnet">
        <DetailRow label="Payer wallet" value={shortenAddress(row.payer_address)} mono />
        <DetailRow label="Ledger" value={row.ledger ? String(row.ledger) : '—'} mono />
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          Transaction hash
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-800">
          {row.stellar_transaction_hash}
        </Text.Paragraph>
        <Button variant="secondary" onPress={openExplorer}>
          <Button.Label>VIEW STELLAR TRANSACTION</Button.Label>
        </Button>
      </SectionCard>

      <PosTenderCard existingPos={merchant?.existing_pos} />
    </Screen>
  );
}
