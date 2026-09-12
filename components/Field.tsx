import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Input, Text } from 'heroui-native';
import type { TextInputProps } from 'react-native';

import { cn } from '@/lib/utils';

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  prefix?: ReactNode;
  containerClassName?: string;
};

/** Labelled text input with hint and error slots. */
export function Field({
  label,
  hint,
  error,
  prefix,
  containerClassName,
  className,
  ...inputProps
}: FieldProps) {
  return (
    <View className={cn('gap-2', containerClassName)}>
      <Text.Paragraph type="body-sm" className="font-medium text-neutral-700">
        {label}
      </Text.Paragraph>
      <View className="flex-row items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3">
        {prefix}
        <Input
          {...inputProps}
          background={null}
          className={cn('flex-1 border-0 bg-transparent px-0 py-3 text-neutral-900', className)}
        />
      </View>
      {error ? (
        <Text.Paragraph type="body-xs" className="text-failed">
          {error}
        </Text.Paragraph>
      ) : hint ? (
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          {hint}
        </Text.Paragraph>
      ) : null}
    </View>
  );
}
