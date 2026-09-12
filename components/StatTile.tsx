import { View } from 'react-native';
import { Text } from 'heroui-native';

import { cn } from '@/lib/utils';

type StatTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive';
  className?: string;
};

export function StatTile({ label, value, hint, tone = 'default', className }: StatTileProps) {
  return (
    <View
      className={cn(
        'flex-1 gap-1 rounded-xl border border-neutral-200 bg-white p-4',
        tone === 'positive' && 'border-settled/30 bg-settled-soft',
        className,
      )}
    >
      <Text.Paragraph
        type="body-xs"
        className="font-semibold tracking-widest text-neutral-500 uppercase"
      >
        {label}
      </Text.Paragraph>
      <Text.Heading
        type="h3"
        className={cn('text-neutral-900 tabular-nums', tone === 'positive' && 'text-settled')}
      >
        {value}
      </Text.Heading>
      {hint ? (
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          {hint}
        </Text.Paragraph>
      ) : null}
    </View>
  );
}
