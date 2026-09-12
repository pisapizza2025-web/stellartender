import { View } from 'react-native';
import { Text } from 'heroui-native';

import { CreatePaymentForm } from '@/components/CreatePaymentForm';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { TestnetNotice } from '@/components/TestnetBadge';
import { useMerchantStore } from '@/lib/store/merchant';

export default function NewPaymentScreen() {
  const merchant = useMerchantStore((s) => s.merchant);

  return (
    <Screen contentClassName="gap-5">
      <TestnetNotice />

      <View className="gap-1">
        <Text.Heading type="h3" className="text-neutral-900">
          New alternative payment
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          {merchant?.business_name ?? 'Your business'} · keep the order open in{' '}
          {merchant?.existing_pos ?? 'your POS'} until the payment settles.
        </Text.Paragraph>
      </View>

      <SectionCard title="CREATE PAYMENT">
        <CreatePaymentForm />
      </SectionCard>

      <SectionCard title="How it works">
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          1. Enter the amount from your POS.
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          2. The customer scans the QR code, or taps an NFC tag holding the same link.
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          3. They pay from their own Stellar wallet — no card details, no app install for you.
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          4. When Stellar confirms, this screen shows PAYMENT SETTLED. You then close the order in
          your POS using an external payment tender.
        </Text.Paragraph>
      </SectionCard>
    </Screen>
  );
}
