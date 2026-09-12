#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn setup(env: &Env) -> (Address, Address, Address, Address) {
    let issuer = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(issuer.clone());
    let token = sac.address();
    let payer = Address::generate(env);
    let merchant = Address::generate(env);
    let platform = Address::generate(env);

    StellarAssetClient::new(env, &token).mint(&payer, &1_000_000_000);

    (token, payer, merchant, platform)
}

#[test]
fn settles_and_splits_the_fee() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let (token, payer, merchant, platform) = setup(&env);
    let contract_id = env.register(AlternativePayment, ());
    let client = AlternativePaymentClient::new(&env, &contract_id);

    // 100.0000000 units at 30 bps => merchant 99.7, platform 0.3
    let amount = 1_000_000_000i128;
    let settlement = client.pay(
        &String::from_str(&env, "X7K29Q42"),
        &token,
        &payer,
        &merchant,
        &platform,
        &amount,
        &30,
    );

    assert_eq!(settlement.platform_fee, 3_000_000);
    assert_eq!(settlement.merchant_amount, 997_000_000);
    assert_eq!(settlement.gross_amount, amount);

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&merchant), 997_000_000);
    assert_eq!(token_client.balance(&platform), 3_000_000);
}

#[test]
fn rejects_a_duplicate_payment_id() {
    let env = Env::default();
    env.mock_all_auths();

    let (token, payer, merchant, platform) = setup(&env);
    let contract_id = env.register(AlternativePayment, ());
    let client = AlternativePaymentClient::new(&env, &contract_id);
    let payment_id = String::from_str(&env, "DUPLICATE");

    client.pay(&payment_id, &token, &payer, &merchant, &platform, &100_000, &30);

    let second = client.try_pay(&payment_id, &token, &payer, &merchant, &platform, &100_000, &30);
    assert!(second.is_err());
    assert!(client.is_settled(&payment_id));
}

#[test]
fn rejects_non_positive_amounts() {
    let env = Env::default();
    env.mock_all_auths();

    let (token, payer, merchant, platform) = setup(&env);
    let contract_id = env.register(AlternativePayment, ());
    let client = AlternativePaymentClient::new(&env, &contract_id);

    let result = client.try_pay(
        &String::from_str(&env, "ZEROAMT1"),
        &token,
        &payer,
        &merchant,
        &platform,
        &0,
        &30,
    );
    assert!(result.is_err());
}

#[test]
fn rejects_an_excessive_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let (token, payer, merchant, platform) = setup(&env);
    let contract_id = env.register(AlternativePayment, ());
    let client = AlternativePaymentClient::new(&env, &contract_id);

    let result = client.try_pay(
        &String::from_str(&env, "BIGFEE01"),
        &token,
        &payer,
        &merchant,
        &platform,
        &100_000,
        &5_000,
    );
    assert!(result.is_err());
}
