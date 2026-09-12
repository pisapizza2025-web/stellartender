import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Text } from 'heroui-native';

import { ErrorNotice } from '@/components/ErrorNotice';
import { Field } from '@/components/Field';
import { OptionChips } from '@/components/OptionChips';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { TestnetNotice } from '@/components/TestnetBadge';
import { updateMerchant, updateSettings } from '@/lib/payments/api';
import { effectiveRatePct, formatPercent } from '@/lib/payments/fees';
import { POS_OPTIONS, type PosOption } from '@/lib/payments/types';
import { isStellarAddress, SOROBAN_CONTRACT_ID } from '@/lib/stellar/config';
import { toPaymentError } from '@/lib/stellar/errors';
import { useMerchantStore } from '@/lib/store/merchant';

export default function SettingsScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const settings = useMerchantStore((s) => s.settings);
  const setMerchant = useMerchantStore((s) => s.setMerchant);
  const setSettings = useMerchantStore((s) => s.setSettings);
  const signOut = useMerchantStore((s) => s.signOut);

  const [businessName, setBusinessName] = useState('');
  const [pos, setPos] = useState<PosOption | null>(null);
  const [wallet, setWallet] = useState('');
  const [cardRate, setCardRate] = useState('1.75');
  const [businessBusy, setBusinessBusy] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessSaved, setBusinessSaved] = useState(false);

  const [feeBps, setFeeBps] = useState('30');
  const [platformWallet, setPlatformWallet] = useState('');
  const [assetCode, setAssetCode] = useState('TESTGBP');
  const [assetIssuer, setAssetIssuer] = useState('');
  const [xlmRate, setXlmRate] = useState('0.25');
  const [settlementCost, setSettlementCost] = useState('0');
  const [payBaseUrl, setPayBaseUrl] = useState('');
  const [platformBusy, setPlatformBusy] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [platformSaved, setPlatformSaved] = useState(false);

  const [prevMerchant, setPrevMerchant] = useState(merchant);
  if (merchant && merchant !== prevMerchant) {
    setPrevMerchant(merchant);
    setBusinessName(merchant.business_name);
    setPos(POS_OPTIONS.find((option) => option === merchant.existing_pos) ?? null);
    setWallet(merchant.stellar_wallet);
    setCardRate(String(merchant.card_processing_rate));
  }

  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings && settings !== prevSettings) {
    setPrevSettings(settings);
    setFeeBps(String(settings.platform_fee_bps));
    setPlatformWallet(settings.platform_wallet ?? '');
    setAssetCode(settings.settlement_asset_code);
    setAssetIssuer(settings.settlement_asset_issuer ?? '');
    setXlmRate(String(settings.xlm_gbp_rate));
    setSettlementCost(String(settings.settlement_cost_pct));
    setPayBaseUrl(settings.pay_base_url ?? '');
  }

  const saveBusiness = useCallback(async () => {
    if (!merchant) return;
    if (businessName.trim().length < 2) {
      setBusinessError('Enter your business name.');
      return;
    }
    if (!isStellarAddress(wallet)) {
      setBusinessError('Enter a valid Stellar public address (starts with G).');
      return;
    }
    const rate = Number(cardRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 10) {
      setBusinessError('Enter your card rate as a percentage, for example 1.75.');
      return;
    }

    setBusinessBusy(true);
    setBusinessError(null);
    try {
      const updated = await updateMerchant(merchant.id, {
        business_name: businessName.trim(),
        existing_pos: pos ?? merchant.existing_pos,
        stellar_wallet: wallet.trim(),
        card_processing_rate: rate,
      });
      setMerchant(updated);
      setBusinessSaved(true);
      setTimeout(() => setBusinessSaved(false), 2000);
    } catch (cause) {
      setBusinessError(toPaymentError(cause).message);
    } finally {
      setBusinessBusy(false);
    }
  }, [merchant, businessName, pos, wallet, cardRate, setMerchant]);

  const savePlatform = useCallback(async () => {
    const bps = Number(feeBps);
    if (!Number.isInteger(bps) || bps < 0 || bps > 1000) {
      setPlatformError('Platform fee must be between 0 and 1000 basis points.');
      return;
    }
    if (platformWallet.trim().length > 0 && !isStellarAddress(platformWallet)) {
      setPlatformError('Platform wallet must be a Stellar public address.');
      return;
    }
    if (assetCode.trim().toUpperCase() !== 'XLM' && !isStellarAddress(assetIssuer)) {
      setPlatformError(`Enter the ${assetCode.trim().toUpperCase()} issuer address, or use XLM.`);
      return;
    }

    setPlatformBusy(true);
    setPlatformError(null);
    try {
      const updated = await updateSettings({
        platform_fee_bps: bps,
        platform_wallet: platformWallet.trim().length > 0 ? platformWallet.trim() : null,
        settlement_asset_code: assetCode.trim().toUpperCase(),
        settlement_asset_issuer: assetIssuer.trim().length > 0 ? assetIssuer.trim() : null,
        xlm_gbp_rate: Number(xlmRate) || 0.25,
        settlement_cost_pct: Number(settlementCost) || 0,
        pay_base_url: payBaseUrl.trim().length > 0 ? payBaseUrl.trim() : null,
      });
      setSettings(updated);
      setPlatformSaved(true);
      setTimeout(() => setPlatformSaved(false), 2000);
    } catch (cause) {
      setPlatformError(toPaymentError(cause).message);
    } finally {
      setPlatformBusy(false);
    }
  }, [
    feeBps,
    platformWallet,
    assetCode,
    assetIssuer,
    xlmRate,
    settlementCost,
    payBaseUrl,
    setSettings,
  ]);

  const altRate = effectiveRatePct(Number(feeBps) || 0, Number(settlementCost) || 0);

  return (
    <Screen contentClassName="gap-5">
      <TestnetNotice />

      <SectionCard
        title="Your business"
        subtitle="Used on the customer payment page and in your POS instructions."
      >
        <Field label="Business name" value={businessName} onChangeText={setBusinessName} />
        <View className="gap-2">
          <Text.Paragraph type="body-sm" className="font-medium text-neutral-700">
            Existing POS
          </Text.Paragraph>
          <OptionChips options={POS_OPTIONS} value={pos} onChange={setPos} />
        </View>
        <Field
          label="Stellar receiving wallet"
          value={wallet}
          onChangeText={setWallet}
          autoCapitalize="characters"
          autoCorrect={false}
          hint="Public address only. Never enter a secret key or recovery phrase."
        />
        <Field
          label="Current card processing rate (%)"
          value={cardRate}
          onChangeText={setCardRate}
          keyboardType="decimal-pad"
          inputMode="decimal"
          hint="Used for savings estimates. Demo default is 1.75%."
          error={businessError}
        />
        <Button isDisabled={businessBusy} onPress={() => void saveBusiness()}>
          <Button.Label>
            {businessBusy ? 'Saving…' : businessSaved ? 'Saved' : 'Save business details'}
          </Button.Label>
        </Button>
      </SectionCard>

      <SectionCard
        title="Platform configuration"
        subtitle={`Demo settings. Alternative Stellar Payment effective rate: ${formatPercent(altRate)}.`}
      >
        <Field
          label="Platform fee (basis points)"
          value={feeBps}
          onChangeText={setFeeBps}
          keyboardType="number-pad"
          inputMode="numeric"
          hint="30 bps = 0.30%. Configurable — nothing is hard-coded to one rate."
        />
        <Field
          label="Platform wallet (Stellar public address)"
          value={platformWallet}
          onChangeText={setPlatformWallet}
          autoCapitalize="characters"
          autoCorrect={false}
          hint="Leave empty to send the full amount to the merchant with no fee split."
        />
        <Field
          label="Settlement asset code"
          value={assetCode}
          onChangeText={setAssetCode}
          autoCapitalize="characters"
          hint="TESTGBP is a demo testnet asset — not real or redeemable GBP. Use XLM to settle natively."
        />
        <Field
          label="TESTGBP issuer address"
          value={assetIssuer}
          onChangeText={setAssetIssuer}
          autoCapitalize="characters"
          autoCorrect={false}
          hint="Required for TESTGBP. Payments fall back to XLM when a wallet has no trustline."
        />
        <Field
          label="Demo XLM → GBP rate"
          value={xlmRate}
          onChangeText={setXlmRate}
          keyboardType="decimal-pad"
          inputMode="decimal"
          hint="Only used to convert the order amount when settling in XLM. Demo figure, not a market price."
        />
        <Field
          label="Extra settlement cost (%)"
          value={settlementCost}
          onChangeText={setSettlementCost}
          keyboardType="decimal-pad"
          inputMode="decimal"
          hint="Added to the platform fee when calculating your effective rate."
        />
        <Field
          label="Public payment base URL"
          value={payBaseUrl}
          onChangeText={setPayBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          hint="Used for QR codes and NFC tags, e.g. https://your-app.example. Leave empty to use this browser's origin."
          error={platformError}
        />
        <Button isDisabled={platformBusy} onPress={() => void savePlatform()}>
          <Button.Label>
            {platformBusy ? 'Saving…' : platformSaved ? 'Saved' : 'Save platform configuration'}
          </Button.Label>
        </Button>
        <Text.Paragraph type="body-xs" className="text-neutral-500">
          Soroban contract:{' '}
          {settings?.soroban_contract_id ||
            SOROBAN_CONTRACT_ID ||
            'not deployed — using real classic Stellar split payments'}
        </Text.Paragraph>
      </SectionCard>

      <SectionCard title="Demo and reference">
        <Button variant="secondary" onPress={() => router.push('/demo')}>
          <Button.Label>HACKATHON DEMO MODE</Button.Label>
        </Button>
        <Link href="/pos-compatibility" className="py-2 text-neutral-900">
          Works alongside your existing POS
        </Link>
        <Link href="/roadmap" className="py-2 text-neutral-900">
          Product roadmap
        </Link>
      </SectionCard>

      {businessError && !businessBusy ? (
        <ErrorNotice title="Could not save" message={businessError} />
      ) : null}

      <Button variant="outline" onPress={() => void signOut()}>
        <Button.Label>Sign out</Button.Label>
      </Button>
    </Screen>
  );
}
