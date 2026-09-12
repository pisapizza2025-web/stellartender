/**
 * The customer payment flow, end to end.
 *
 * connect wallet -> verify network + funds -> build split transaction ->
 * sign in the wallet -> submit to Stellar Testnet -> server verifies the
 * transaction on Horizon -> session becomes settled.
 *
 * Nothing here marks a payment as paid: only the payment-public function can,
 * and only after re-reading the transaction from Horizon.
 */

import { PaymentError, toPaymentError } from '@/lib/stellar/errors';
import { submitTransaction } from '@/lib/stellar/horizon';
import { buildSplitPaymentXdr, preflightPayer, type SplitPaymentRequest } from '@/lib/stellar/tx';
import { assertTestnetWallet, connectWallet, signTransactionXdr } from '@/lib/stellar/wallet';

import { settlePublicPayment, updatePublicStatus } from './api';
import type { PublicSession } from './types';

export type PayStage =
  | 'idle'
  | 'connecting'
  | 'checking'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'settled';

export const STAGE_COPY: Record<PayStage, string> = {
  idle: '',
  connecting: 'Opening your wallet…',
  checking: 'Checking your testnet balance…',
  building: 'Preparing the payment…',
  signing: 'Confirm the payment in your wallet',
  submitting: 'Sending to Stellar Testnet…',
  confirming: 'Waiting for Stellar confirmation…',
  settled: 'Payment settled',
};

export type PayHandlers = {
  onStage: (stage: PayStage) => void;
  onAddress?: (address: string) => void;
  onHash?: (hash: string) => void;
};

function requestFrom(session: PublicSession, payer: string): SplitPaymentRequest {
  return {
    payer,
    merchantWallet: session.merchant_wallet,
    platformWallet: session.platform_wallet,
    merchantAmount: session.merchant_amount,
    platformFee: session.platform_fee,
    assetCode: session.asset_code,
    assetIssuer: session.asset_issuer,
    memo: session.memo ?? session.public_token,
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Poll the server until it has verified the transaction on Horizon. A newly
 * submitted transaction can take a few seconds to become readable.
 */
export async function confirmSettlement(
  token: string,
  hash: string,
  attempts = 15,
): Promise<PublicSession> {
  let lastError: PaymentError | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const result = await settlePublicPayment(token, hash);
      return result.session;
    } catch (cause) {
      const error = toPaymentError(cause);
      lastError = error;
      if (
        error.code === 'tx_not_found' ||
        error.code === 'rpc_failure' ||
        error.code === 'network_error'
      ) {
        await sleep(2000);
        continue;
      }
      throw error;
    }
  }

  throw (
    lastError ??
    new PaymentError(
      'tx_not_found',
      'Stellar has not confirmed this payment yet. It may still complete — keep this page open.',
    )
  );
}

/** Run the whole customer payment. Throws a PaymentError on any failure. */
export async function payWithStellar(
  session: PublicSession,
  handlers: PayHandlers,
): Promise<{ hash: string; session: PublicSession }> {
  const token = session.public_token;
  let hash: string | null = null;

  try {
    handlers.onStage('connecting');
    const { address } = await connectWallet();
    handlers.onAddress?.(address);
    await updatePublicStatus(token, 'wallet_connected', { payer_address: address });

    handlers.onStage('checking');
    await assertTestnetWallet();
    const request = requestFrom(session, address);
    await preflightPayer(request);

    handlers.onStage('building');
    const xdr = await buildSplitPaymentXdr(request);

    handlers.onStage('signing');
    await updatePublicStatus(token, 'authorising', { payer_address: address });
    const signed = await signTransactionXdr(xdr, address);

    handlers.onStage('submitting');
    const submitted = await submitTransaction(signed);
    hash = submitted.hash;
    handlers.onHash?.(submitted.hash);
    await updatePublicStatus(token, 'submitted', {
      payer_address: address,
      stellar_transaction_hash: submitted.hash,
    });

    handlers.onStage('confirming');
    const settled = await confirmSettlement(token, submitted.hash);
    handlers.onStage('settled');
    return { hash: submitted.hash, session: settled };
  } catch (cause) {
    const error = toPaymentError(cause);
    // Record the failure so the merchant terminal reflects it, but never
    // overwrite a settled or expired session.
    if (error.code !== 'expired' && error.code !== 'already_settled') {
      try {
        await updatePublicStatus(token, 'failed', {
          failure_reason: error.message,
          ...(hash ? { stellar_transaction_hash: hash } : {}),
        });
      } catch {
        // Status reporting is best-effort.
      }
    }
    throw error;
  }
}
