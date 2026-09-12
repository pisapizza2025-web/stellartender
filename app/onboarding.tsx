import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from 'heroui-native';

import { Field } from '@/components/Field';
import { OptionChips } from '@/components/OptionChips';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { TestnetNotice } from '@/components/TestnetBadge';
import { createMerchant } from '@/lib/payments/api';
import { POS_OPTIONS, type PosOption } from '@/lib/payments/types';
import { isStellarAddress } from '@/lib/stellar/config';
import { useMerchantStore } from '@/lib/store/merchant';

/** One-time merchant setup. The POS stays exactly as it is — we only record which one it is. */
export default function OnboardingScreen() {
  const setMerchant = useMerchantStore((s) => s.setMerchant);
  const [businessName, setBusinessName] = useState('');
  const [pos, setPos] = useState<PosOption | null>(null);
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (businessName.trim().length < 2) {
      setError('Enter your business name.');
      return;
    }
    if (!pos) {
      setError('Select the POS you already use.');
      return;
    }
    if (!isStellarAddress(wallet)) {
      setError('Enter a Stellar public address starting with G (56 characters).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const merchant = await createMerchant({
        business_name: businessName.trim(),
        existing_pos: pos,
        stellar_wallet: wallet.trim(),
      });
      setMerchant(merchant);
      router.replace('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your business.');
    } finally {
      setBusy(false);
    }
  }, [businessName, pos, wallet, setMerchant]);

  return (
    <Screen
      contentClassName="gap-5"
      footer={
        <Button size="lg" isDisabled={busy} onPress={() => void submit()}>
          <Button.Label>{busy ? 'Saving…' : 'Finish setup'}</Button.Label>
        </Button>
      }
    >
      <TestnetNotice />

      <View className="gap-2">
        <Text.Heading type="h3" className="text-neutral-900">
          Add another way to get paid
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          Your POS runs your business. Stellar Flexi Payment handles the alternative payment — no
          migration, no card details.
        </Text.Paragraph>
      </View>

      <SectionCard title="Your business">
        <Field
          label="Business name"
          placeholder="Mario's Kitchen"
          value={businessName}
          onChangeText={setBusinessName}
          autoCapitalize="words"
        />
      </SectionCard>

      <SectionCard
        title="Existing POS"
        subtitle="We never change or connect to your POS. This only tailors the instructions you see after each payment."
      >
        <OptionChips options={POS_OPTIONS} value={pos} onChange={setPos} />
      </SectionCard>

      <SectionCard
        title="Stellar receiving wallet"
        subtitle="Testnet public address only. Never share a secret key or recovery phrase — this app never asks for one."
      >
        <Field
          label="Stellar public address"
          placeholder="GABC…"
          value={wallet}
          onChangeText={setWallet}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error}
        />
      </SectionCard>
    </Screen>
  );
}
