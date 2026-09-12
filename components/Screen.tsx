import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { cn } from '@/lib/utils';

type ScreenProps = {
  children: ReactNode;
  /** Render inside a ScrollView (default) or a plain flex container. */
  scroll?: boolean;
  /** Sticky footer, e.g. a primary action button. */
  footer?: ReactNode;
  contentClassName?: string;
  className?: string;
};

/**
 * Standard screen shell: soft neutral background, keyboard-safe padding and an
 * optional sticky footer for the primary action.
 */
export function Screen({
  children,
  scroll = true,
  footer,
  contentClassName,
  className,
}: ScreenProps) {
  const body = <View className={cn('gap-4 px-5 pt-5 pb-10', contentClassName)}>{children}</View>;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={cn('flex-1 bg-neutral-50', className)}
    >
      {scroll ? (
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1">{body}</View>
      )}
      {footer ? (
        <View className="pb-safe-offset-4 border-t border-neutral-200 bg-white px-5 pt-3">
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
