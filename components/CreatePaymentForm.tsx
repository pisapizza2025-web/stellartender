import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from 'heroui-native';

import { ErrorNotice } from '@/components/ErrorNotice';
import { Field } from '@/components/Field';
import { createPaymentSession } from '@/lib/payments/api';
import { toPaymentError } from '@/lib/stellar/errors';

type CreatePaymentFormProps = {
  /** Prefills the order reference, used by demo mode. */
  defaultReference?: string;
};

/**
 * Terminal-style payment entry: the merchant types the GBP amount from their
 * POS. No asset or blockchain choices here — the server resolves settlement.
 */
export function CreatePaymentForm({ defaultReference = '' }: CreatePaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState(defaultReference);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async () => {
    const value = Number(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter the amount to charge, for example 48.20.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await createPaymentSession({
        amount_gbp: value,
        order_reference: reference.trim().length > 0 ? reference.trim() : null,
      });
      setAmount('');
      setReference(defaultReference);
      router.push({ pathname: '/payment/[id]', params: { id: result.session.id } });
    } catch (cause) {
      setError(toPaymentError(cause).message);
    } finally {
      setBusy(false);
    }
  }, [amount, reference, defaultReference]);

  return (
    <View className="gap-4">
      <Field
        label="Amount"
        placeholder="48.20"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        inputMode="decimal"
        prefix={
          <Text.Heading type="h4" className="text-neutral-500">
            £
          </Text.Heading>
        }
      />
      <Field
        label="Order reference (optional)"
        placeholder="TABLE-12"
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
      />
      {error ? <ErrorNotice title="Cannot create payment" message={error} /> : null}
      <Button size="lg" isDisabled={busy} onPress={() => void create()}>
        <Button.Label>{busy ? 'Creating…' : 'CREATE ALTERNATIVE PAYMENT'}</Button.Label>
      </Button>
      <Text.Paragraph type="body-xs" className="text-neutral-500">
        Take the amount from your existing POS. Nothing in your POS changes.
      </Text.Paragraph>
    </View>
  );
}
