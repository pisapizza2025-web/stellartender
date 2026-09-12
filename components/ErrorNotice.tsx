import { View } from 'react-native';
import { Button, Text } from 'heroui-native';

import { cn } from '@/lib/utils';

type ErrorNoticeProps = {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/** Human-readable failure card. Never shows stack traces or result codes alone. */
export function ErrorNotice({
  message,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorNoticeProps) {
  return (
    <View className={cn('border-failed/30 bg-failed-soft gap-3 rounded-2xl border p-4', className)}>
      <Text.Paragraph type="body-sm" className="text-failed font-semibold">
        {title}
      </Text.Paragraph>
      <Text.Paragraph type="body-sm" className="text-neutral-700">
        {message}
      </Text.Paragraph>
      {onRetry ? (
        <Button variant="outline" size="sm" onPress={onRetry} className="self-start">
          <Button.Label>{retryLabel}</Button.Label>
        </Button>
      ) : null}
    </View>
  );
}
