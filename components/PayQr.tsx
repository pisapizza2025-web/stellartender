import { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Text } from 'heroui-native';
import { create as createQrMatrix } from 'qrcode/lib/core/qrcode';

import { Path, Svg } from '@/components/ui/primitives/Svg';
import { cn } from '@/lib/utils';

type PayQrProps = {
  url: string;
  /** QR pixel size. */
  size?: number;
  className?: string;
};

/**
 * Encodes `value` and returns one SVG path drawing every dark module as a
 * horizontal run, stroked at module width. Same approach the QR SVG libraries
 * use, without depending on their component layer.
 */
function buildQrPath(value: string, size: number) {
  const { modules } = createQrMatrix(value, { errorCorrectionLevel: 'M' });
  const count = modules.size;
  const cellSize = size / count;
  const midpoint = (row: number) => cellSize / 2 + cellSize * row;

  let path = '';

  for (let row = 0; row < count; row += 1) {
    let runStart: number | null = null;

    for (let column = 0; column < count; column += 1) {
      const isDark = Boolean(modules.data[row * count + column]);

      if (isDark && runStart === null) {
        runStart = column;
      }

      const runEnds = runStart !== null && (!isDark || column === count - 1);
      if (runEnds && runStart !== null) {
        const endColumn = isDark ? column + 1 : column;
        path +=
          `M${cellSize * runStart} ${midpoint(row)} ` +
          `L${cellSize * endColumn} ${midpoint(row)} `;
        runStart = null;
      }
    }
  }

  return { path, cellSize };
}

/**
 * QR + link panel. The encoded URL is the same value that can be written to an
 * NFC tag later, and it always references one payment session.
 */
export function PayQr({ url, size = 220, className }: PayQrProps) {
  const [copied, setCopied] = useState(false);

  const qr = useMemo(() => {
    try {
      return buildQrPath(url, size);
    } catch {
      return null;
    }
  }, [url, size]);

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
        {qr ? (
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Path
              d={qr.path}
              stroke="#0a0a0a"
              strokeWidth={qr.cellSize}
              strokeLinecap="butt"
              fill="none"
            />
          </Svg>
        ) : (
          <View style={{ width: size, height: size }} className="items-center justify-center">
            <Text.Paragraph type="body-sm" className="text-neutral-500">
              QR unavailable
            </Text.Paragraph>
          </View>
        )}
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
