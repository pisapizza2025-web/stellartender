import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from 'heroui-native';

import { cn } from '@/lib/utils';

type DetailRowProps = {
  label: string;
  value?: string | number | null;
  /** Render a custom value node instead of text. */
  children?: ReactNode;
  mono?: boolean;
  emphasis?: boolean;
  className?: string;
};

export function DetailRow({ label, value, children, mono, emphasis, className }: DetailRowProps) {
  return (
    <View className={cn('flex-row items-center justify-between gap-4 py-1.5', className)}>
      <Text.Paragraph type="body-sm" className="text-neutral-500">
        {label}
      </Text.Paragraph>
      {children ?? (
        <Text.Paragraph
          type="body-sm"
          className={cn(
            'flex-1 text-right text-neutral-900',
            mono && 'font-mono tabular-nums',
            emphasis && 'font-semibold',
          )}
        >
          {value ?? '—'}
        </Text.Paragraph>
      )}
    </View>
  );
}
