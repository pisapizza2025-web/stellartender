import { useMemo } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { Text } from 'heroui-native';

import { CreatePaymentForm } from '@/components/CreatePaymentForm';
import { DetailRow } from '@/components/DetailRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { StatTile } from '@/components/StatTile';
import { TestnetNotice } from '@/components/TestnetBadge';
import { summariseTransactions, type TransactionWithSession } from '@/lib/payments/api';
import { DEFAULT_PLATFORM_FEE_BPS, estimateSavings, formatPercent } from '@/lib/payments/fees';
import { formatGbp, formatGbpCompact } from '@/lib/payments/format';
import { useTransactions } from '@/lib/payments/hooks';
import { useMerchantStore } from '@/lib/store/merchant';

const gbpFeeFor = (row: TransactionWithSession) => (row.amount_gbp * row.platform_fee_bps) / 10_000;

export default function DashboardScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const settings = useMerchantStore((s) => s.settings);
  const { rows, error } = useTransactions();

  const stats = useMemo(() => summariseTransactions(rows, gbpFeeFor), [rows]);

  const cardRate = merchant?.card_processing_rate ?? 1.75;
  const feeBps = settings?.platform_fee_bps ?? DEFAULT_PLATFORM_FEE_BPS;
  const settlementCost = settings?.settlement_cost_pct ?? 0;

  const today = estimateSavings(stats.todayVolume, cardRate, feeBps, settlementCost);
  const month = estimateSavings(stats.monthVolume, cardRate, feeBps, settlementCost);
  const lifetime = estimateSavings(stats.lifetimeVolume, cardRate, feeBps, settlementCost);

  return (
    <Screen contentClassName="gap-5 pt-safe-offset-4">
      <View className="gap-1">
        <Text.Heading type="h2" className="text-neutral-900">
          Stellar Flexi Payment
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          Keep your POS. Add a cheaper alternative way to get paid.
        </Text.Paragraph>
      </View>

      <TestnetNotice />

      {error ? <ErrorNotice title="Could not load your payments" message={error} /> : null}

      <SectionCard eyebrow="Your business" title={merchant?.business_name ?? '—'}>
        <DetailRow label="Existing POS" value={merchant?.existing_pos ?? '—'} emphasis />
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          Your POS runs your business. Stellar Flexi Payment handles the alternative payment.
        </Text.Paragraph>
      </SectionCard>

      <View className="flex-row gap-3">
        <StatTile
          label="Today"
          value={formatGbpCompact(stats.todayVolume)}
          hint="Flexi Payment volume"
        />
        <StatTile label="Payments" value={String(stats.todayCount)} hint="Settled today" />
      </View>
      <StatTile
        label="Fees avoided today"
        value={formatGbp(today.savings)}
        hint={`Estimate vs ${formatPercent(cardRate)} card rate`}
        tone="positive"
      />

      <SectionCard
        title="CREATE PAYMENT"
        subtitle="Enter the amount showing on your POS. The customer scans and pays from their own wallet."
      >
        <CreatePaymentForm />
      </SectionCard>

      <SectionCard
        title="Savings dashboard"
        subtitle="Estimates only, based on your configured card rate and the current platform fee."
      >
        <Text.Paragraph
          type="body-xs"
          className="font-semibold tracking-widest text-neutral-500 uppercase"
        >
          This month
        </Text.Paragraph>
        <DetailRow label="Flexi Payment volume processed" value={formatGbp(month.volume)} />
        <DetailRow label="Estimated traditional card fees" value={formatGbp(month.cardFees)} />
        <DetailRow label="Stellar Flexi Payment fees" value={formatGbp(month.altFees)} />
        <DetailRow label="Estimated savings" value={formatGbp(month.savings)} emphasis />
        <View className="bg-settled-soft mt-2 gap-1 rounded-xl p-4">
          <Text.Paragraph
            type="body-xs"
            className="text-settled font-semibold tracking-widest uppercase"
          >
            Lifetime savings (estimate)
          </Text.Paragraph>
          <Text.Heading type="h2" className="text-settled tabular-nums">
            {formatGbp(lifetime.savings)}
          </Text.Heading>
          <Text.Paragraph type="body-xs" className="text-neutral-600">
            {formatGbp(lifetime.volume)} processed · effective rate{' '}
            {formatPercent(lifetime.altRatePct)} vs {formatPercent(cardRate)}
          </Text.Paragraph>
        </View>
      </SectionCard>

      <SectionCard title="More">
        <Link href="/transactions" className="py-2 text-neutral-900">
          Transaction history
        </Link>
        <Link href="/pos-compatibility" className="py-2 text-neutral-900">
          Works alongside your existing POS
        </Link>
        <Link href="/roadmap" className="py-2 text-neutral-900">
          Product roadmap
        </Link>
        <Link href="/demo" className="py-2 text-neutral-900">
          Hackathon demo mode
        </Link>
      </SectionCard>
    </Screen>
  );
}
