import { View } from 'react-native';
import { Text } from 'heroui-native';

import { cn } from '@/lib/utils';

type PosTenderCardProps = {
  existingPos: string | null | undefined;
  className?: string;
};

/**
 * The POS is never touched by this app. After settlement the merchant records
 * the sale in their own POS using an external / custom tender.
 */
export function PosTenderCard({ existingPos, className }: PosTenderCardProps) {
  const pos = existingPos && existingPos.length > 0 ? existingPos : 'your existing POS';

  return (
    <View
      className={cn('gap-3 rounded-2xl border border-neutral-900 bg-neutral-900 p-5', className)}
    >
      <Text.Paragraph
        type="body-xs"
        className="font-semibold tracking-widest text-neutral-400 uppercase"
      >
        Next step in your POS
      </Text.Paragraph>
      <Text.Heading type="h4" className="text-white">
        Now close the order in {pos} using your external payment method / custom tender.
      </Text.Heading>
      <View className="gap-1 rounded-xl bg-white/10 p-3">
        <Text.Paragraph type="body-xs" className="text-neutral-300">
          Suggested tender name
        </Text.Paragraph>
        <Text.Paragraph type="body" className="font-semibold text-white">
          Stellar Flexi Payment
        </Text.Paragraph>
      </View>
      <Text.Paragraph type="body-xs" className="text-neutral-400">
        Your POS keeps running orders, VAT, staff and reporting. This app only handles the payment.
      </Text.Paragraph>
    </View>
  );
}
