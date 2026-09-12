import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from 'heroui-native';

import { cn } from '@/lib/utils';

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** White card used for every grouped block in the merchant app. */
export function SectionCard({
  title,
  subtitle,
  eyebrow,
  action,
  children,
  className,
}: SectionCardProps) {
  const hasHeader = Boolean(title || subtitle || eyebrow || action);

  return (
    <View className={cn('gap-4 rounded-2xl border border-neutral-200 bg-white p-5', className)}>
      {hasHeader ? (
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            {eyebrow ? (
              <Text.Paragraph
                type="body-xs"
                className="font-semibold tracking-widest text-neutral-500 uppercase"
              >
                {eyebrow}
              </Text.Paragraph>
            ) : null}
            {title ? (
              <Text.Heading type="h4" className="text-neutral-900">
                {title}
              </Text.Heading>
            ) : null}
            {subtitle ? (
              <Text.Paragraph type="body-sm" className="text-neutral-500">
                {subtitle}
              </Text.Paragraph>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
