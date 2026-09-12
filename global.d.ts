declare module '*.css';

// `qrcode` ships no types for its internal core module. Only the pure encoder is
// imported (no canvas / fs entry points), so declare just what is used.
declare module 'qrcode/lib/core/qrcode' {
  export function create(
    data: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; version?: number },
  ): {
    modules: { size: number; data: Uint8Array };
  };
}
