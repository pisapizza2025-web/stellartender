import { useMemo } from 'react';
import { Linking, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Spinner, Text } from 'heroui-native';

import { DetailRow } from '@/components/DetailRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { MoneyValue } from '@/components/MoneyValue';
import { PayQr } from '@/components/PayQr';
import { PosTenderCard } from '@/components/PosTenderCard';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { StatusPill } from '@/components/StatusPill';
import { TestnetNotice } from '@/components/TestnetBadge';
import { buildPayUrl } from '@/lib/payments/api';
import {
  formatAsset,
  formatCountdown,
  formatGbp,
  shortenAddress,
  shortenHash,
} from '@/lib/payments/format';
import { useCountdown, useMerchantSession } from '@/lib/payments/hooks';
import { bpsToPercent, formatPercent } from '@/lib/payments/fees';
import type { PaymentStatus } from '@/lib/payments/types';
import { explorerTxUrl } from '@/lib/stellar/config';
import { useMerchantStore } from '@/lib/store/merchant';

const WAITING: PaymentStatus[] = ['pending', 'wallet_connected', 'authorising', 'submitted'];

export default function PaymentRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const merchant = useMerchantStore((s) => s.merchant);
  const settings = useMerchantStore((s) => s.settings);
  const { session, loading, error, refresh } = useMerchantSession(id);

  const status = session?.status ?? 'pending';
  const waiting = WAITING.includes(status);
  const secondsLeft = useCountdown(session?.expires_at, waiting);

  const payUrl = useMemo(
    () => (session ? buildPayUrl(session.public_token, settings?.pay_base_url) : ''),
    [session, settings?.pay_base_url],
  );

  const assetFallback =
    session &&
    session.asset_code === 'XLM' &&
    (settings?.settlement_asset_code ?? 'XLM').toUpperCase() !== 'XLM';

  const openExplorer = () => {
    if (!session?.stellar_transaction_hash) return;
    const url = explorerTxUrl(session.stellar_transaction_hash);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
      return;
    }
    void Linking.openURL(url);
  };

  if (loading && !session) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Spinner />
      </View>
    );
  }

  if (!session) {
    return (
      <Screen>
        <ErrorNotice
          title="Payment request not found"
          message={error ?? 'This payment request no longer exists.'}
          onRetry={() => void refresh()}
        />
        <Button onPress={() => router.replace('/dashboard')}>
          <Button.Label>Back to terminal</Button.Label>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-5">
      <TestnetNotice />

      <View className="gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <Text.Heading type="h4" className="text-neutral-900">
          {merchant?.business_name ?? 'Your business'}
        </Text.Heading>
        <MoneyValue
          amountGbp={session.amount_gbp}
          settlementAmount={session.settlement_amount}
          assetCode={session.asset_code}
          size="lg"
        />
        {session.order_reference ? (
          <Text.Paragraph className="text-neutral-600">
            Order {session.order_reference}
          </Text.Paragraph>
        ) : null}
        <StatusPill status={status} />
        {waiting ? (
          <Text.Paragraph type="body-sm" className="text-neutral-500">
            {secondsLeft > 0
              ? `Expires in ${formatCountdown(secondsLeft)}`
              : 'Checking expiry with the server…'}
          </Text.Paragraph>
        ) : null}
      </View>

      {assetFallback ? (
        <View className="border-testnet/30 bg-testnet-soft rounded-xl border p-4">
          <Text.Paragraph type="body-sm" className="text-neutral-700">
            Settling in XLM for this payment: a {settings?.settlement_asset_code} trustline was not
            available. Commercial order {formatGbp(session.amount_gbp)}, testnet settlement{' '}
            {formatAsset(session.settlement_amount, session.asset_code)}. XLM is not GBP.
          </Text.Paragraph>
        </View>
      ) : null}

      {waiting ? (
        <SectionCard title="Customer payment">
          <PayQr url={payUrl} />
          <Text.Paragraph type="body-sm" align="center" className="text-neutral-500">
            {status === 'pending'
              ? 'Waiting for the customer to scan…'
              : status === 'submitted'
                ? 'Transaction submitted — waiting for Stellar confirmation.'
                : 'The customer has connected their wallet.'}
          </Text.Paragraph>
        </SectionCard>
      ) : null}

      {status === 'settled' ? (
        <>
          <View className="border-settled/30 bg-settled-soft gap-2 rounded-2xl border p-5">
            <Text.Heading type="h2" className="text-settled">
              ✓ PAYMENT SETTLED
            </Text.Heading>
            <Text.Heading type="h3" className="text-neutral-900">
              {formatGbp(session.amount_gbp)}
            </Text.Heading>
            {session.order_reference ? (
              <Text.Paragraph className="text-neutral-700">
                Order {session.order_reference}
              </Text.Paragraph>
            ) : null}
            <Text.Paragraph type="body-sm" className="text-neutral-600">
              PAYMENT RECEIVED — verified on Stellar Testnet.
            </Text.Paragraph>
          </View>

          <SectionCard title="Settlement detail">
            <DetailRow
              label="Merchant receives"
              value={formatAsset(session.merchant_amount, session.asset_code)}
              emphasis
            />
            <DetailRow
              label={`Platform fee (${formatPercent(bpsToPercent(session.platform_fee_bps))})`}
              value={formatAsset(session.platform_fee, session.asset_code)}
            />
            <DetailRow
              label="Gross settlement"
              value={formatAsset(session.settlement_amount, session.asset_code)}
            />
            <DetailRow label="Payer wallet" value={shortenAddress(session.payer_address)} mono />
            <DetailRow
              label="Transaction"
              value={shortenHash(session.stellar_transaction_hash)}
              mono
            />
            <Button variant="secondary" onPress={openExplorer}>
              <Button.Label>VIEW STELLAR TRANSACTION</Button.Label>
            </Button>
          </SectionCard>

          <PosTenderCard existingPos={merchant?.existing_pos} />

          <Button onPress={() => router.replace('/new-payment')}>
            <Button.Label>Take another payment</Button.Label>
          </Button>
        </>
      ) : null}

      {status === 'expired' ? (
        <SectionCard title="PAYMENT REQUEST EXPIRED">
          <Text.Paragraph type="body-sm" className="text-neutral-600">
            This request can no longer be paid. Create a new payment to charge the customer.
          </Text.Paragraph>
          <Button onPress={() => router.replace('/new-payment')}>
            <Button.Label>Create a new payment</Button.Label>
          </Button>
        </SectionCard>
      ) : null}

      {status === 'failed' ? (
        <>
          <ErrorNotice
            title="PAYMENT FAILED"
            message={
              session.failure_reason ??
              'The customer payment did not complete. Nothing has been taken.'
            }
          />
          <SectionCard title="What to do">
            <Text.Paragraph type="body-sm" className="text-neutral-600">
              The customer can try again from the same payment page while this request is still
              valid, or you can create a new payment.
            </Text.Paragraph>
            <PayQr url={payUrl} size={160} />
            <Button variant="secondary" onPress={() => router.replace('/new-payment')}>
              <Button.Label>Create a new payment</Button.Label>
            </Button>
          </SectionCard>
        </>
      ) : null}

      <Text.Paragraph type="body-xs" className="text-neutral-500">
        This screen updates itself. Real Stellar Testnet settlement. No real money.
      </Text.Paragraph>
    </Screen>
  );
}
