import { View } from 'react-native';
import { Text } from 'heroui-native';

import { cn } from '@/lib/utils';

/** Small always-visible reminder that this MVP runs on Stellar Testnet. */
export function TestnetBadge({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'border-testnet/30 bg-testnet-soft self-start rounded-full border px-2.5 py-1',
        className,
      )}
    >
      <Text.Paragraph type="body-xs" className="text-testnet font-semibold tracking-wide">
        TESTNET
      </Text.Paragraph>
    </View>
  );
}

/** Full-width notice used at the top of merchant and customer screens. */
export function TestnetNotice({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'border-testnet/25 bg-testnet-soft flex-row items-center gap-2 rounded-xl border px-3 py-2.5',
        className,
      )}
    >
      <TestnetBadge />
      <Text.Paragraph type="body-xs" className="text-testnet flex-1 font-medium">
        TESTNET DEMO — NO REAL MONEY
      </Text.Paragraph>
    </View>
  );
}
