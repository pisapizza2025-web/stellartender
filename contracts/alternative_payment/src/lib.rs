#![no_std]
//! Alternative Stellar Payment — split settlement contract.
//!
//! The contract settles one merchant payment in a single authorised call:
//! the merchant receives the net amount, the platform receives the configured
//! basis-point fee, and the payment id is recorded so the same commercial
//! payment can never be settled twice.
//!
//! No customer personal data is accepted, stored or emitted. The only values
//! that touch contract state are Stellar addresses, token amounts and the
//! merchant-generated payment id.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

/// Highest platform fee the contract will accept, in basis points (10%).
const MAX_FEE_BPS: u32 = 1_000;
const BPS_DENOMINATOR: i128 = 10_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// amount must be greater than zero
    InvalidAmount = 1,
    /// platform_fee_bps above the accepted maximum
    InvalidFee = 2,
    /// this payment_id has already been settled
    AlreadySettled = 3,
    /// the fee split would leave the merchant nothing
    InvalidSplit = 4,
    /// payment_id is empty or unusably long
    InvalidPaymentId = 5,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Settlement record for one payment id.
    Payment(String),
}

/// Minimal settlement state. Blockchain-relevant values only.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub token: Address,
    pub payer: Address,
    pub merchant: Address,
    pub platform: Address,
    pub gross_amount: i128,
    pub merchant_amount: i128,
    pub platform_fee: i128,
    pub platform_fee_bps: u32,
    pub settled_at: u64,
}

#[contract]
pub struct AlternativePayment;

#[contractimpl]
impl AlternativePayment {
    /// Settle one alternative payment.
    ///
    /// * `payment_id` — merchant-generated public payment token (no personal data).
    /// * `token` — SAC / token contract address of the settlement asset (e.g. TESTGBP or native XLM).
    /// * `payer` — customer wallet; must authorise this invocation.
    /// * `merchant` — merchant receiving wallet.
    /// * `platform` — Alternative Stellar Payment platform wallet.
    /// * `amount` — gross settlement amount in token stroops/units.
    /// * `platform_fee_bps` — platform fee in basis points (30 = 0.30%).
    pub fn pay(
        env: Env,
        payment_id: String,
        token: Address,
        payer: Address,
        merchant: Address,
        platform: Address,
        amount: i128,
        platform_fee_bps: u32,
    ) -> Result<Settlement, Error> {
        if payment_id.len() == 0 || payment_id.len() > 64 {
            return Err(Error::InvalidPaymentId);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if platform_fee_bps > MAX_FEE_BPS {
            return Err(Error::InvalidFee);
        }

        // The customer must authorise the transfer; the contract never holds keys.
        payer.require_auth();

        let key = DataKey::Payment(payment_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadySettled);
        }

        let platform_fee = amount * i128::from(platform_fee_bps) / BPS_DENOMINATOR;
        let merchant_amount = amount - platform_fee;
        if merchant_amount <= 0 {
            return Err(Error::InvalidSplit);
        }

        let client = token::TokenClient::new(&env, &token);
        client.transfer(&payer, &merchant, &merchant_amount);
        if platform_fee > 0 {
            client.transfer(&payer, &platform, &platform_fee);
        }

        let settlement = Settlement {
            token: token.clone(),
            payer: payer.clone(),
            merchant: merchant.clone(),
            platform: platform.clone(),
            gross_amount: amount,
            merchant_amount,
            platform_fee,
            platform_fee_bps,
            settled_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &settlement);

        // PaymentSettled event: topics (event name, payment id, merchant),
        // data carries the settlement split. No personal data is emitted.
        env.events().publish(
            (
                symbol_short!("pay_settl"),
                payment_id.clone(),
                merchant.clone(),
            ),
            (
                payer,
                token,
                platform,
                amount,
                merchant_amount,
                platform_fee,
                platform_fee_bps,
                env.ledger().timestamp(),
            ),
        );

        Ok(settlement)
    }

    /// Settlement record for a payment id, if it was settled by this contract.
    pub fn get_settlement(env: Env, payment_id: String) -> Option<Settlement> {
        env.storage()
            .persistent()
            .get(&DataKey::Payment(payment_id))
    }

    /// Whether this payment id has already been settled.
    pub fn is_settled(env: Env, payment_id: String) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Payment(payment_id))
    }
}

mod test;
