import { Redirect, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Spinner } from 'heroui-native';
import { BarChart3, PlusCircle, Receipt, Settings } from 'lucide-react-native';
import { View } from 'react-native';

import { useMerchantStore } from '@/lib/store/merchant';

export default function TabLayout() {
  const ready = useMerchantStore((s) => s.ready);
  const session = useMerchantStore((s) => s.session);
  const merchant = useMerchantStore((s) => s.merchant);
  const loadingProfile = useMerchantStore((s) => s.loadingProfile);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Spinner />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  if (!merchant && !loadingProfile) return <Redirect href="/onboarding" />;

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#0a0a0a',
          headerTitleStyle: { color: '#0a0a0a' },
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: '#fafafa' },
          tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e5e5e5' },
          tabBarActiveTintColor: '#0a0a0a',
          tabBarInactiveTintColor: '#a3a3a3',
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Terminal',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="new-payment"
          options={{
            title: 'New payment',
            tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color, size }) => <Receipt color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size ?? 24} />,
          }}
        />
      </Tabs>
    </>
  );
}
