import { Pressable, View } from 'react-native';
import { Text } from 'heroui-native';

import { cn } from '@/lib/utils';

type OptionChipsProps<T extends string> = {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
};

/** Simple single-select chip grid, used for the merchant's existing POS. */
export function OptionChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: OptionChipsProps<T>) {
  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            className={cn(
              'rounded-full border px-4 py-2',
              selected ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white',
            )}
          >
            <Text.Paragraph
              type="body-sm"
              className={cn('font-medium', selected ? 'text-white' : 'text-neutral-700')}
            >
              {option}
            </Text.Paragraph>
          </Pressable>
        );
      })}
    </View>
  );
}
