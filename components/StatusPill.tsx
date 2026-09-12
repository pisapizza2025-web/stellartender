import { View } from 'react-native';
import { Text } from 'heroui-native';

import { statusMeta, type StatusTone } from '@/lib/payments/status';
import type { PaymentStatus } from '@/lib/payments/types';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: 'border-neutral-300 bg-neutral-100',
  progress: 'border-stellar/30 bg-stellar-soft',
  success: 'border-settled/30 bg-settled-soft',
  danger: 'border-failed/30 bg-failed-soft',
};

const TONE_TEXT: Record<StatusTone, string> = {
  neutral: 'text-neutral-700',
  progress: 'text-stellar',
  success: 'text-settled',
  danger: 'text-failed',
};

type StatusPillProps = {
  status: PaymentStatus;
  /** Customer-facing wording instead of merchant terminal wording. */
  audience?: 'merchant' | 'customer';
  label?: string;
  className?: string;
};

export function StatusPill({ status, audience = 'merchant', label, className }: StatusPillProps) {
  const meta = statusMeta(status);
  const text = label ?? (audience === 'customer' ? meta.customerLabel : meta.merchantLabel);

  return (
    <View
      className={cn(
        'self-start rounded-full border px-3 py-1.5',
        TONE_STYLES[meta.tone],
        className,
      )}
    >
      <Text.Paragraph
        type="body-xs"
        className={cn('font-semibold tracking-wide', TONE_TEXT[meta.tone])}
      >
        {text}
      </Text.Paragraph>
    </View>
  );
}

export function toneTextClass(tone: StatusTone): string {
  return TONE_TEXT[tone];
}
