import { View } from 'react-native';
import { Text } from 'heroui-native';

import { formatAsset, formatGbp } from '@/lib/payments/format';
import { cn } from '@/lib/utils';

type MoneyValueProps = {
  amountGbp: number | string;
  /** Optional testnet settlement line, shown under the commercial amount. */
  settlementAmount?: number | string | null;
  assetCode?: string | null;
  label?: string;
  size?: 'md' | 'lg' | 'xl';
  align?: 'start' | 'center';
  className?: string;
};

const SIZE: Record<NonNullable<MoneyValueProps['size']>, string> = {
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
};

/**
 * Commercial GBP amount as the hero value, with the testnet settlement amount
 * shown separately — the demo never claims a testnet asset is real money.
 */
export function MoneyValue({
  amountGbp,
  settlementAmount,
  assetCode,
  label,
  size = 'lg',
  align = 'start',
  className,
}: MoneyValueProps) {
  const alignItems = align === 'center' ? 'items-center' : 'items-start';
  const textAlign = align === 'center' ? 'center' : 'start';

  return (
    <View className={cn('gap-1', alignItems, className)}>
      {label ? (
        <Text.Paragraph
          type="body-xs"
          align={textAlign}
          className="font-semibold tracking-widest text-neutral-500 uppercase"
        >
          {label}
        </Text.Paragraph>
      ) : null}
      <Text.Heading
        type="h1"
        align={textAlign}
        className={cn('font-bold text-neutral-900 tabular-nums', SIZE[size])}
      >
        {formatGbp(amountGbp)}
      </Text.Heading>
      {settlementAmount != null ? (
        <Text.Paragraph type="body-sm" align={textAlign} className="text-neutral-500">
          Testnet settlement {formatAsset(settlementAmount, assetCode)}
        </Text.Paragraph>
      ) : null}
    </View>
  );
}
