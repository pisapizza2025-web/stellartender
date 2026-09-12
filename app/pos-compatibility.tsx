import { View } from 'react-native';
import { Text } from 'heroui-native';

import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { POS_OPTIONS } from '@/lib/payments/types';

export default function PosCompatibilityScreen() {
  return (
    <Screen contentClassName="gap-5">
      <View className="gap-2">
        <Text.Heading type="h2" className="text-neutral-900">
          Works alongside your existing POS
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          Alternative Stellar Payment is an independent payment method. Your existing POS continues
          managing your business.
        </Text.Paragraph>
      </View>

      <SectionCard title="Keep your POS. Change the payment rail.">
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          Your POS keeps orders, menu, inventory, VAT, staff, receipts, reporting and kitchen
          operations. This app only adds another tender next to Cash and Card.
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          For this MVP, after receiving payment you record the transaction using your POS&apos;s
          supported external or custom payment tender — suggested name: Alternative Stellar Payment.
        </Text.Paragraph>
      </SectionCard>

      <SectionCard
        title="Designed to operate alongside"
        subtitle="Designed to operate alongside existing POS systems. Native integrations can be added later."
      >
        <View className="flex-row flex-wrap gap-2">
          {POS_OPTIONS.filter((option) => option !== 'Other').map((option) => (
            <View
              key={option}
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
            >
              <Text.Paragraph type="body-sm" className="font-medium text-neutral-800">
                {option}
              </Text.Paragraph>
              <Text.Paragraph type="body-xs" className="text-neutral-500">
                External tender
              </Text.Paragraph>
            </View>
          ))}
        </View>
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          No official integrations are claimed. Nothing in your POS is modified, scraped or
          reverse-engineered, and no POS API access is required.
        </Text.Paragraph>
      </SectionCard>

      <SectionCard title="Payment flow">
        <Text.Paragraph type="body-sm" className="text-neutral-600">
          Existing POS: £48.20 order → merchant opens Alternative Stellar Payment → enters £48.20 →
          QR / NFC payment request → customer pays via Stellar → app says PAID → merchant records
          Alternative Stellar Payment as external tender in the existing POS.
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="font-semibold text-neutral-900">
          The POS remains completely intact.
        </Text.Paragraph>
      </SectionCard>
    </Screen>
  );
}
