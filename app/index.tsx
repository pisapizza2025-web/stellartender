import { Redirect } from 'expo-router';
import { Spinner } from 'heroui-native';
import { View } from 'react-native';

import { useMerchantStore } from '@/lib/store/merchant';

/** Entry gate: sign in -> onboarding -> merchant dashboard. */
export default function Index() {
  const ready = useMerchantStore((s) => s.ready);
  const session = useMerchantStore((s) => s.session);
  const merchant = useMerchantStore((s) => s.merchant);
  const loadingProfile = useMerchantStore((s) => s.loadingProfile);

  if (!ready || (session && loadingProfile && !merchant)) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Spinner />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (!merchant) return <Redirect href="/onboarding" />;
  return <Redirect href="/dashboard" />;
}
