/**
 * Wallet access through Stellar Wallets Kit.
 *
 * The kit is a browser technology (extension bridges + DOM modal), so it is
 * loaded lazily and only on web. The app never sees a secret key: signing
 * happens inside the customer's wallet and only a signed XDR comes back.
 */

import { Platform } from 'react-native';

import { TESTNET_PASSPHRASE } from './config';
import { PaymentError, toPaymentError } from './errors';

export const isWalletSigningSupported = Platform.OS === 'web';

type KitClass = typeof import('@creit.tech/stellar-wallets-kit').StellarWalletsKit;

let kitPromise: Promise<KitClass> | null = null;

async function loadKit(): Promise<KitClass> {
  if (!isWalletSigningSupported) {
    throw new PaymentError(
      'wallet_unavailable',
      'Wallet signing runs in the browser. Open this payment link in a web browser to pay.',
      false,
    );
  }

  kitPromise ??= (async () => {
    const [sdk, freighter, albedo, lobstr, rabet, xbull, hana] = await Promise.all([
      import('@creit.tech/stellar-wallets-kit'),
      import('@creit.tech/stellar-wallets-kit/modules/freighter'),
      import('@creit.tech/stellar-wallets-kit/modules/albedo'),
      import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
      import('@creit.tech/stellar-wallets-kit/modules/rabet'),
      import('@creit.tech/stellar-wallets-kit/modules/xbull'),
      import('@creit.tech/stellar-wallets-kit/modules/hana'),
    ]);

    sdk.StellarWalletsKit.init({
      network: sdk.Networks.TESTNET,
      selectedWalletId: freighter.FREIGHTER_ID,
      modules: [
        new freighter.FreighterModule(),
        new albedo.AlbedoModule(),
        new lobstr.LobstrModule(),
        new rabet.RabetModule(),
        new xbull.xBullModule(),
        new hana.HanaModule(),
      ],
    });

    return sdk.StellarWalletsKit;
  })();

  try {
    return await kitPromise;
  } catch (cause) {
    kitPromise = null;
    throw toPaymentError(cause);
  }
}

/** Open the wallet picker and return the connected public address. */
export async function connectWallet(): Promise<{ address: string }> {
  const kit = await loadKit();
  try {
    const { address } = await kit.authModal();
    if (!address) throw new PaymentError('wallet_closed');
    return { address };
  } catch (cause) {
    throw toPaymentError(cause);
  }
}

/**
 * Confirm the connected wallet is on Stellar Testnet. Wallets that cannot
 * report a network (some mobile wallets) are allowed through — Horizon
 * submission would reject a mainnet-signed envelope anyway.
 */
export async function assertTestnetWallet(): Promise<void> {
  const kit = await loadKit();
  try {
    const { networkPassphrase } = await kit.getNetwork();
    if (networkPassphrase && networkPassphrase !== TESTNET_PASSPHRASE) {
      throw new PaymentError('wrong_network');
    }
  } catch (cause) {
    if (cause instanceof PaymentError) throw cause;
    // Wallet does not expose its network; continue and let Stellar validate.
  }
}

/** Ask the connected wallet to sign a transaction envelope. */
export async function signTransactionXdr(xdr: string, address: string): Promise<string> {
  const kit = await loadKit();
  try {
    const { signedTxXdr } = await kit.signTransaction(xdr, {
      address,
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    if (!signedTxXdr) throw new PaymentError('wallet_rejected');
    return signedTxXdr;
  } catch (cause) {
    throw toPaymentError(cause);
  }
}

export async function disconnectWallet(): Promise<void> {
  if (!isWalletSigningSupported || !kitPromise) return;
  try {
    const kit = await kitPromise;
    await kit.disconnect();
  } catch {
    // Nothing to clean up.
  }
}
