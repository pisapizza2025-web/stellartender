import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Text } from 'heroui-native';

import { DetailRow } from '@/components/DetailRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { StatusPill } from '@/components/StatusPill';
import { TestnetNotice } from '@/components/TestnetBadge';
import {
  createPaymentSession,
  fetchSessions,
  updateMerchant,
  type PaymentSessionRow,
} from '@/lib/payments/api';
import { formatGbp, formatTime } from '@/lib/payments/format';
import { FRIENDBOT_URL } from '@/lib/stellar/config';
import { toPaymentError } from '@/lib/stellar/errors';
import { useMerchantStore } from '@/lib/store/merchant';

const QUICK_AMOUNTS = [10, 25, 50];

export default function DemoScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const settings = useMerchantStore((s) => s.settings);
  const setMerchant = useMerchantStore((s) => s.setMerchant);

  const [sessions, setSessions] = useState<PaymentSessionRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await fetchSessions(10));
    } catch (cause) {
      setError(toPaymentError(cause).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  const loadDemoProfile = useCallback(async () => {
    if (!merchant) return;
    setBusy('profile');
    setError(null);
    try {
      const updated = await updateMerchant(merchant.id, {
        business_name: "Mario's Kitchen",
        existing_pos: 'Square',
        card_processing_rate: 1.75,
      });
      setMerchant(updated);
      setNotice("Demo profile loaded: Mario's Kitchen, existing POS Square.");
    } catch (cause) {
      setError(toPaymentError(cause).message);
    } finally {
      setBusy(null);
    }
  }, [merchant, setMerchant]);

  const quickPayment = useCallback(async (amount: number) => {
    setBusy(`amount-${amount}`);
    setError(null);
    try {
      const result = await createPaymentSession({
        amount_gbp: amount,
        order_reference: 'TABLE-7',
      });
      router.push({ pathname: '/payment/[id]', params: { id: result.session.id } });
    } catch (cause) {
      setError(toPaymentError(cause).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const fund = useCallback(async (address: string, label: string) => {
    setBusy(`fund-${label}`);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`);
      if (res.ok) {
        setNotice(`Friendbot funded the ${label} wallet with test XLM.`);
      } else {
        const body: unknown = await res.json().catch(() => null);
        const detail =
          body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
            ? body.detail
            : '';
        setNotice(
          detail.includes('createAccountAlreadyExist')
            ? `The ${label} wallet already exists on Testnet.`
            : `Friendbot could not fund the ${label} wallet right now.`,
        );
      }
    } catch {
      setError('Could not reach Friendbot. Check your connection.');
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <Screen contentClassName="gap-5">
      <TestnetNotice />

      <View className="gap-2">
        <Text.Heading type="h2" className="text-neutral-900">
          HACKATHON DEMO MODE
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          Shortcuts for the live demo. Stellar settlement is never faked — every payment here is a
          real Stellar Testnet transaction.
        </Text.Paragraph>
      </View>

      {notice ? (
        <View className="border-stellar/30 bg-stellar-soft rounded-xl border p-4">
          <Text.Paragraph type="body-sm" className="text-neutral-700">
            {notice}
          </Text.Paragraph>
        </View>
      ) : null}
      {error ? <ErrorNotice message={error} /> : null}

      <SectionCard title="Demo merchant" subtitle="Sets the profile used in the demo script.">
        <DetailRow label="Business" value={merchant?.business_name ?? '—'} />
        <DetailRow label="Existing POS" value={merchant?.existing_pos ?? '—'} />
        <Button
          variant="secondary"
          isDisabled={busy === 'profile'}
          onPress={() => void loadDemoProfile()}
        >
          <Button.Label>
            {busy === 'profile' ? 'Loading…' : "Load Mario's Kitchen demo profile"}
          </Button.Label>
        </Button>
      </SectionCard>

      <SectionCard title="Quick payment" subtitle="Creates a payment for order TABLE-7.">
        <View className="flex-row gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              className="flex-1"
              isDisabled={busy === `amount-${amount}`}
              onPress={() => void quickPayment(amount)}
            >
              <Button.Label>{formatGbp(amount)}</Button.Label>
            </Button>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Testnet wallet funding"
        subtitle="Friendbot funds Stellar Testnet accounts with test XLM. No keys are involved — funding only needs a public address."
      >
        <DetailRow label="Merchant wallet" value={merchant?.stellar_wallet ?? '—'} mono />
        {merchant?.stellar_wallet ? (
          <Button
            variant="outline"
            isDisabled={busy === 'fund-merchant'}
            onPress={() => void fund(merchant.stellar_wallet, 'merchant')}
          >
            <Button.Label>Fund merchant wallet with Friendbot</Button.Label>
          </Button>
        ) : null}
        <DetailRow
          label="Platform wallet"
          value={settings?.platform_wallet ?? 'not configured'}
          mono
        />
        {settings?.platform_wallet ? (
          <Button
            variant="outline"
            isDisabled={busy === 'fund-platform'}
            onPress={() => void fund(settings.platform_wallet ?? '', 'platform')}
          >
            <Button.Label>Fund platform wallet with Friendbot</Button.Label>
          </Button>
        ) : null}
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          The customer wallet funds itself: install Freighter, switch it to Testnet, and use its own
          Friendbot funding. This app never asks for a secret key, seed phrase or recovery phrase.
        </Text.Paragraph>
      </SectionCard>

      <SectionCard
        title="Transaction state viewer"
        subtitle="Your 10 most recent payment requests."
      >
        {sessions.length === 0 ? (
          <Text.Paragraph type="body-sm" className="text-neutral-500">
            No payment requests yet.
          </Text.Paragraph>
        ) : (
          sessions.map((session) => (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/payment/[id]', params: { id: session.id } })}
              className="gap-2 border-b border-neutral-100 py-3"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text.Paragraph type="body-sm" className="font-semibold text-neutral-900">
                  {formatGbp(session.amount_gbp)} · {session.public_token}
                </Text.Paragraph>
                <Text.Paragraph type="body-xs" className="text-neutral-500">
                  {formatTime(session.created_at)}
                </Text.Paragraph>
              </View>
              <StatusPill status={session.status} />
            </Pressable>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}
