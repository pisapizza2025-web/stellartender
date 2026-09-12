import { useCallback, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Spinner, Text } from 'heroui-native';

import { DetailRow } from '@/components/DetailRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { MoneyValue } from '@/components/MoneyValue';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { StatusPill } from '@/components/StatusPill';
import { TestnetBadge } from '@/components/TestnetBadge';
import { bpsToPercent, formatPercent } from '@/lib/payments/fees';
import { payWithStellar, STAGE_COPY, type PayStage } from '@/lib/payments/flow';
import { formatAsset, formatCountdown, formatGbp } from '@/lib/payments/format';
import { useCountdown, usePublicSession } from '@/lib/payments/hooks';
import type { PublicSession } from '@/lib/payments/types';
import { explorerTxUrl } from '@/lib/stellar/config';
import { toPaymentError } from '@/lib/stellar/errors';
import { isWalletSigningSupported } from '@/lib/stellar/wallet';

const openUrl = (url: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank');
    return;
  }
  void Linking.openURL(url);
};

export default function CustomerPaymentScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const normalised = (token ?? '').toUpperCase();
  const { session, loading, error, refresh, setSession, setPaused } = usePublicSession(normalised);

  const [stage, setStage] = useState<PayStage>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  const busy = stage !== 'idle' && stage !== 'settled';
  const status = session?.status ?? 'pending';
  const countdown = useCountdown(session?.expires_at, status === 'pending' || status === 'failed');

  const pay = useCallback(
    async (current: PublicSession) => {
      setPayError(null);
      setPaused(true);
      try {
        const result = await payWithStellar(current, { onStage: setStage });
        setSession(result.session);
        setStage('settled');
      } catch (cause) {
        const err = toPaymentError(cause);
        setPayError(err.message);
        setRetryable(err.retryable);
        setStage('idle');
        await refresh();
      } finally {
        setPaused(false);
      }
    },
    [refresh, setPaused, setSession],
  );

  if (loading && !session) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Spinner />
      </View>
    );
  }

  if (!session) {
    return (
      <Screen contentClassName="gap-5 pt-safe-offset-6">
        <ErrorNotice
          title="Payment not found"
          message={error ?? 'This payment link is not valid. Ask the merchant for a new one.'}
        />
      </Screen>
    );
  }

  if (acknowledged) {
    return (
      <Screen contentClassName="gap-4 pt-safe-offset-16" scroll={false}>
        <Text.Heading type="h3" align="center" className="text-neutral-900">
          Thanks — you&apos;re all done
        </Text.Heading>
        <Text.Paragraph align="center" className="text-neutral-500">
          You can close this page. {session.business_name} has the confirmation.
        </Text.Paragraph>
      </Screen>
    );
  }

  const settled = status === 'settled';
  const expired = status === 'expired';
  const txHash = session.stellar_transaction_hash;

  return (
    <Screen contentClassName="gap-5 pt-safe-offset-6">
      <View className="flex-row items-center justify-between">
        <Text.Paragraph type="body-sm" className="font-semibold text-neutral-900">
          Stellar Flexi Payment
        </Text.Paragraph>
        <TestnetBadge />
      </View>

      <View className="items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <Text.Heading type="h4" align="center" className="text-neutral-900">
          {session.business_name}
        </Text.Heading>
        <MoneyValue
          amountGbp={session.amount_gbp}
          settlementAmount={session.asset_code === 'XLM' ? session.settlement_amount : null}
          assetCode={session.asset_code}
          label={settled ? 'Paid' : 'Amount due'}
          size="xl"
          align="center"
        />
        {session.order_reference ? (
          <Text.Paragraph className="text-neutral-600">
            Order {session.order_reference}
          </Text.Paragraph>
        ) : null}
        <StatusPill status={status} audience="customer" />
        {!settled && !expired ? (
          <Text.Paragraph type="body-sm" className="text-neutral-500">
            {countdown > 0
              ? `This request expires in ${formatCountdown(countdown)}`
              : 'This request has expired.'}
          </Text.Paragraph>
        ) : null}
      </View>

      {settled ? (
        <>
          <View className="border-settled/30 bg-settled-soft gap-3 rounded-2xl border p-6">
            <Text.Heading type="h2" align="center" className="text-settled">
              ✓ PAYMENT COMPLETE
            </Text.Heading>
            <Text.Paragraph align="center" className="text-neutral-800">
              {session.business_name} · {formatGbp(session.amount_gbp)}
              {session.order_reference ? ` · Order ${session.order_reference}` : ''}
            </Text.Paragraph>
            <Text.Paragraph type="body-xs" align="center" className="text-neutral-600">
              Stellar Testnet transaction
            </Text.Paragraph>
            <Text.Paragraph type="body-sm" align="center" className="text-neutral-800">
              {txHash}
            </Text.Paragraph>
            <Text.Paragraph type="body-xs" align="center" className="text-neutral-600">
              Payment settled using Stellar Testnet. Merchant receives confirmation automatically.
            </Text.Paragraph>
          </View>
          {txHash ? (
            <Button variant="secondary" onPress={() => openUrl(explorerTxUrl(txHash))}>
              <Button.Label>View Stellar transaction</Button.Label>
            </Button>
          ) : null}
          <Button size="lg" onPress={() => setAcknowledged(true)}>
            <Button.Label>DONE</Button.Label>
          </Button>
        </>
      ) : expired ? (
        <SectionCard title="PAYMENT REQUEST EXPIRED">
          <Text.Paragraph type="body-sm" className="text-neutral-600">
            For your safety this request can no longer be paid. Ask {session.business_name} to
            create a new payment.
          </Text.Paragraph>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Review before you pay">
            <DetailRow
              label="Merchant receives"
              value={formatAsset(session.merchant_amount, session.asset_code)}
            />
            <DetailRow
              label={`Platform fee (${formatPercent(bpsToPercent(session.platform_fee_bps))})`}
              value={formatAsset(session.platform_fee, session.asset_code)}
            />
            <DetailRow
              label="Total from your wallet"
              value={formatAsset(session.settlement_amount, session.asset_code)}
              emphasis
            />
            {session.asset_code === 'TESTGBP' ? (
              <Text.Paragraph type="body-xs" className="text-neutral-500">
                TESTGBP is a demo testnet asset shown at £1 for this demonstration only. It is not
                real, regulated or redeemable GBP.
              </Text.Paragraph>
            ) : (
              <Text.Paragraph type="body-xs" className="text-neutral-500">
                Commercial order {formatGbp(session.amount_gbp)}. Testnet settlement{' '}
                {formatAsset(session.settlement_amount, session.asset_code)}. XLM is not GBP.
              </Text.Paragraph>
            )}
          </SectionCard>

          {payError ? (
            <ErrorNotice
              title="Payment not completed"
              message={payError}
              onRetry={retryable ? () => void pay(session) : undefined}
              retryLabel="Try again"
            />
          ) : null}

          {isWalletSigningSupported ? (
            <View className="gap-3">
              <Button
                size="lg"
                isDisabled={busy || countdown === 0}
                onPress={() => void pay(session)}
              >
                <Button.Label>{busy ? STAGE_COPY[stage] : 'CONNECT WALLET & PAY'}</Button.Label>
              </Button>
              {busy ? (
                <View className="flex-row items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <Text.Paragraph type="body-sm" className="text-neutral-500">
                    {STAGE_COPY[stage]}
                  </Text.Paragraph>
                </View>
              ) : null}
              <Text.Paragraph type="body-xs" align="center" className="text-neutral-500">
                Stellar Flexi Payment — an alternative digital payment powered by Stellar. Signing
                happens inside your own wallet — we never see your keys.
              </Text.Paragraph>
            </View>
          ) : (
            <SectionCard title="Open this page in a browser to pay">
              <Text.Paragraph type="body-sm" className="text-neutral-600">
                Stellar wallets such as Freighter run in the browser. Open this payment link in a
                web browser on this device to connect your wallet and pay.
              </Text.Paragraph>
            </SectionCard>
          )}
        </>
      )}

      <Text.Paragraph type="body-xs" align="center" className="text-neutral-400">
        Real Stellar Testnet settlement. No real money. No card details required.
      </Text.Paragraph>
    </Screen>
  );
}
