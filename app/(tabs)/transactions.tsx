import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { Spinner, Text } from 'heroui-native';

import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import type { TransactionWithSession } from '@/lib/payments/api';
import { formatAsset, formatGbp, formatTime, shortenHash } from '@/lib/payments/format';
import { useTransactions } from '@/lib/payments/hooks';

function TransactionRow({ row }: { row: TransactionWithSession }) {
  const open = useCallback(() => {
    router.push({ pathname: '/transactions/[id]', params: { id: row.id } });
  }, [row.id]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={open}
      className="gap-2 border-b border-neutral-200 bg-white px-5 py-4"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3">
          <Text.Paragraph type="body-sm" className="text-neutral-500 tabular-nums">
            {formatTime(row.created_at)}
          </Text.Paragraph>
          <Text.Heading type="h4" className="text-neutral-900 tabular-nums">
            {formatGbp(row.amount_gbp)}
          </Text.Heading>
        </View>
        <StatusPill status="settled" label="SETTLED" />
      </View>
      <View className="flex-row items-center justify-between gap-3">
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          {row.payment_sessions?.order_reference ?? 'No reference'}
        </Text.Paragraph>
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          {shortenHash(row.stellar_transaction_hash)}
        </Text.Paragraph>
      </View>
      <Text.Paragraph type="body-xs" className="text-neutral-500">
        Merchant {formatAsset(row.merchant_amount, row.asset_code)} · Fee{' '}
        {formatAsset(row.platform_fee, row.asset_code)}
      </Text.Paragraph>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const { rows, loading, error, refresh } = useTransactions();

  if (loading && rows.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Spinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      {error ? (
        <View className="p-5">
          <ErrorNotice
            title="Could not load transactions"
            message={error}
            onRetry={() => void refresh()}
          />
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow row={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
        ListHeaderComponent={
          <View className="gap-1 px-5 py-5">
            <Text.Heading type="h3" className="text-neutral-900">
              Flexi Payments
            </Text.Heading>
            <Text.Paragraph type="body-sm" className="text-neutral-500">
              Settled Stellar Testnet payments. Record each one in your POS as an external tender.
            </Text.Paragraph>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center gap-2 px-5 py-16">
            <Text.Heading type="h4" className="text-neutral-900">
              No payments yet
            </Text.Heading>
            <Text.Paragraph type="body-sm" align="center" className="text-neutral-500">
              Create a payment from the terminal tab and pay it from a Stellar Testnet wallet.
            </Text.Paragraph>
          </View>
        }
      />
    </View>
  );
}
