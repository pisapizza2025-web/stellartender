import { useCallback, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Text } from 'heroui-native';
import QRCode from 'react-native-qrcode-svg';

import { cn } from '@/lib/utils';

type PayQrProps = {
  url: string;
  /** QR pixel size. */
  size?: number;
  className?: string;
};

/**
 * QR + link panel. The encoded URL is the same value that can be written to an
 * NFC tag later, and it always references one payment session.
 */
export function PayQr({ url, size = 220, className }: PayQrProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const open = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
      return;
    }
    void Linking.openURL(url);
  }, [url]);

  return (
    <View className={cn('items-center gap-4', className)}>
      <View className="rounded-2xl border border-neutral-200 bg-white p-4">
        <QRCode value={url} size={size} backgroundColor="#ffffff" color="#0a0a0a" />
      </View>
      <Text.Paragraph type="body" className="font-semibold text-neutral-900">
        Scan to pay
      </Text.Paragraph>
      <View className="w-full gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <Text.Paragraph
          type="body-xs"
          className="font-semibold tracking-widest text-neutral-500 uppercase"
        >
          NFC-ready payment URL
        </Text.Paragraph>
        <Text.Paragraph type="body-sm" className="text-neutral-700" numberOfLines={2}>
          {url}
        </Text.Paragraph>
      </View>
      <View className="w-full flex-row gap-2">
        <Button variant="secondary" className="flex-1" onPress={open}>
          <Button.Label>Open payment page</Button.Label>
        </Button>
        <Button variant="outline" className="flex-1" onPress={() => void copy()}>
          <Button.Label>{copied ? 'Link copied' : 'Copy link'}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
