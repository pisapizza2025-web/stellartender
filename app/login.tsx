import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text } from 'heroui-native';

import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { TestnetNotice } from '@/components/TestnetBadge';
import { bilt } from '@/lib/bilt';

type Stage = 'email' | 'code';

/** Merchant sign-in: email plus a 6-digit code. No passwords to manage on a terminal. */
export default function LoginScreen() {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: authError } = await bilt.auth.signInWithOtp({ email: trimmed });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setStage('code');
  }, [email]);

  const verify = useCallback(async () => {
    const token = code.trim();
    if (token.length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: authError } = await bilt.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace('/');
  }, [code, email]);

  return (
    <Screen contentClassName="gap-6 pt-16">
      <View className="gap-2">
        <Text.Heading type="h2" className="text-neutral-900">
          Stellar Flexi Payment
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          Keep your POS. Change the payment rail.
        </Text.Paragraph>
      </View>

      <TestnetNotice />

      <View className="gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
        {stage === 'email' ? (
          <>
            <Text.Heading type="h4" className="text-neutral-900">
              Merchant sign in
            </Text.Heading>
            <Field
              label="Work email"
              placeholder="you@business.co.uk"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              error={error}
            />
            <Button size="lg" isDisabled={busy} onPress={() => void sendCode()}>
              <Button.Label>{busy ? 'Sending code…' : 'Email me a sign-in code'}</Button.Label>
            </Button>
          </>
        ) : (
          <>
            <Text.Heading type="h4" className="text-neutral-900">
              Enter your code
            </Text.Heading>
            <Text.Paragraph type="body-sm" className="text-neutral-500">
              We sent a 6-digit code to {email.trim().toLowerCase()}.
            </Text.Paragraph>
            <Field
              label="6-digit code"
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              error={error}
            />
            <Button size="lg" isDisabled={busy} onPress={() => void verify()}>
              <Button.Label>{busy ? 'Checking…' : 'Sign in'}</Button.Label>
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                setStage('email');
                setCode('');
                setError(null);
              }}
            >
              <Button.Label>Use a different email</Button.Label>
            </Button>
          </>
        )}
      </View>

      <Text.Paragraph type="body-xs" className="text-neutral-500">
        No card details are ever collected. Customers pay from their own Stellar wallet.
      </Text.Paragraph>
    </Screen>
  );
}
