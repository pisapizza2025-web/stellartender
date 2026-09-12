/**
 * Transaction construction for the classic (non-contract) settlement path.
 *
 * The customer signs ONE transaction that carries both legs of the split:
 * merchant amount to the merchant wallet, platform fee to the platform wallet,
 * with the payment token as the text memo so settlement can be verified
 * server-side against Horizon.
 *
 * The same split is expressed by the Soroban contract in
 * contracts/alternative_payment (the Soroban crate keeps its original folder and
 * crate name); this path is what runs until a contract id is
 * configured, and it is real Stellar Testnet activity either way.
 */

import { XLM_RESERVE_HEADROOM, TESTNET_PASSPHRASE } from './config';
import { PaymentError } from './errors';
import { balanceFor, loadAccount } from './horizon';

export type SplitPaymentRequest = {
  payer: string;
  merchantWallet: string;
  platformWallet: string | null;
  merchantAmount: number;
  platformFee: number;
  assetCode: string;
  assetIssuer: string | null;
  /** Text memo — the public payment token. */
  memo: string;
};

/** Stellar amounts are strings with at most 7 decimal places. */
export function formatSettlementAmount(amount: number): string {
  return (Math.round(amount * 1e7) / 1e7).toFixed(7);
}

/**
 * Check the payer can actually pay before opening the wallet, so failures are
 * explained in plain English instead of as a Horizon result code.
 */
export async function preflightPayer(req: SplitPaymentRequest): Promise<void> {
  const account = await loadAccount(req.payer);
  if (!account) throw new PaymentError('account_not_funded', undefined, false);

  const total = req.merchantAmount + Math.max(req.platformFee, 0);
  const balance = balanceFor(account.balances, req.assetCode, req.assetIssuer);

  if (balance === null) {
    if (req.assetCode === 'XLM') throw new PaymentError('insufficient_balance');
    throw new PaymentError(
      'no_trustline',
      `This wallet has no ${req.assetCode} trustline, so it cannot pay this request.`,
      false,
    );
  }

  const required = req.assetCode === 'XLM' ? total + XLM_RESERVE_HEADROOM : total;
  if (balance < required) {
    throw new PaymentError(
      'insufficient_balance',
      `This wallet holds ${balance.toFixed(4)} ${req.assetCode} but needs about ${required.toFixed(4)} ${req.assetCode} to pay.`,
    );
  }
}

/** Build the unsigned transaction envelope (XDR) for the split payment. */
export async function buildSplitPaymentXdr(req: SplitPaymentRequest): Promise<string> {
  if (!(req.merchantAmount > 0)) throw new PaymentError('invalid_amount', undefined, false);

  const { Account, Asset, BASE_FEE, Memo, Operation, TransactionBuilder } =
    await import('@stellar/stellar-sdk/base');

  const account = await loadAccount(req.payer);
  if (!account) throw new PaymentError('account_not_funded', undefined, false);

  const asset =
    req.assetCode === 'XLM' || !req.assetIssuer
      ? Asset.native()
      : new Asset(req.assetCode, req.assetIssuer);

  const source = new Account(req.payer, account.sequence);
  const opCount = req.platformWallet && req.platformFee > 0 ? 2 : 1;

  const builder = new TransactionBuilder(source, {
    fee: String(Number(BASE_FEE) * opCount * 2),
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: req.merchantWallet,
        asset,
        amount: formatSettlementAmount(req.merchantAmount),
      }),
    )
    .addMemo(Memo.text(req.memo))
    .setTimeout(180);

  if (req.platformWallet && req.platformFee > 0) {
    builder.addOperation(
      Operation.payment({
        destination: req.platformWallet,
        asset,
        amount: formatSettlementAmount(req.platformFee),
      }),
    );
  }

  return builder.build().toXDR();
}
