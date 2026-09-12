# SETUP.md — external configuration

Stellar Flexi Payment runs end to end without any of this file: it uses the real classic Stellar
Testnet two-operation split payment. Everything below is the external configuration that **cannot**
be completed from inside this environment, with the exact commands needed.

Nothing here requires a secret key in the app. Never paste a secret key, seed phrase or recovery
phrase into the UI or into source control.

---

## 1. Required before the demo (2 minutes, no CLI)

| Step                      | Where                             | Value                                                               |
| ------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| Merchant receiving wallet | Onboarding                        | Testnet public key `G…`                                             |
| Platform wallet           | Settings → Platform configuration | a **different** Testnet public key `G…`                             |
| Platform fee              | Settings                          | `75` bps = 0.75% (demo default: £100 → merchant £99.25, fee £0.75)  |
| Public payment base URL   | Settings                          | the URL another device can open, e.g. `https://<your-expo-web-url>` |
| Fund both wallets         | Demo mode → Friendbot buttons     | test XLM                                                            |

A destination account that has never been funded cannot receive a payment — fund the merchant and
platform wallets before demoing.

### Wallets without the CLI

Install **Freighter**, switch it to **Testnet**, create two accounts (customer, and optionally the
merchant), and use Freighter's own funding. Copy only the **public** keys into the app.

### Wallets with the CLI

```bash
stellar keys generate --global merchant --network testnet --fund
stellar keys generate --global platform --network testnet --fund

stellar keys address merchant     # paste into Onboarding
stellar keys address platform     # paste into Settings → platform wallet
```

---

## 2. Optional: TESTGBP demo asset

Skip this and the app settles in XLM Testnet, showing the commercial GBP amount and the XLM
settlement amount separately. TESTGBP only changes which asset moves.

TESTGBP is a **demo testnet asset**. It is not real, regulated or redeemable GBP.

```bash
# 1. An issuer account for the demo asset
stellar keys generate --global testgbp-issuer --network testnet --fund
export TESTGBP_ISSUER=$(stellar keys address testgbp-issuer)

# 2. Every holder (merchant, platform, customer) needs a trustline.
#    Freighter: Manage Assets → add asset TESTGBP with the issuer above.
#    CLI, per holder:
stellar tx new change-trust \
  --source merchant \
  --network testnet \
  --line TESTGBP:$TESTGBP_ISSUER \
  --limit 1000000

# 3. Issue TESTGBP to the customer test wallet
stellar tx new payment \
  --source testgbp-issuer \
  --network testnet \
  --destination <CUSTOMER_G_ADDRESS> \
  --asset TESTGBP:$TESTGBP_ISSUER \
  --amount 500
```

Then in the app: **Settings → Platform configuration**

- Settlement asset code: `TESTGBP`
- Settlement asset issuer: the `TESTGBP_ISSUER` address

The server checks both sides for a trustline and balance when a payment is created, and falls back to
XLM with a visible reason if either side is not ready. The architecture stays asset-agnostic.

---

## 3. Optional: deploy the Soroban split-payment contract

The contract source is complete at `contracts/alternative_payment/` (folder and crate name kept so
the deploy commands below stay valid). It implements:

```rust
pay(payment_id, token, payer, merchant, platform_wallet, amount, platform_fee_bps)
```

- validates `amount > 0` and `platform_fee_bps <= 10_000`
- `payer.require_auth()`
- computes `platform_fee = amount * bps / 10_000`, `merchant_amount = amount - platform_fee`
  (demo default `bps = 75`, so £100 splits into £99.25 and £0.75)
- transfers the merchant portion to the merchant wallet and the fee to the platform wallet
- rejects a `payment_id` that has already settled (idempotency guard)
- emits a `PaymentSettled` event with `payment_id`, merchant, payer, gross, merchant amount, fee,
  token and ledger context
- stores minimal settlement state only — **no** name, email, phone, IP, bank or POS customer data

Read helpers: `get_settlement(payment_id)`, `is_settled(payment_id)`.

### Build, test, deploy

Requires Rust and the Stellar CLI (`cargo install --locked stellar-cli`, plus
`rustup target add wasm32v1-none`).

```bash
cd contracts/alternative_payment

cargo test                                    # unit tests incl. the double-settle guard
stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/alternative_payment.wasm \
  --source platform \
  --network testnet
# → prints the contract id: C…
```

### Wire the contract id in

Two places, either is enough:

- **Settings → Platform configuration → Soroban contract id**, or
- `.env`:
  ```
  EXPO_PUBLIC_STELLAR_CONTRACT_ID=C...
  ```

The demo's fee split and settlement verification do not change shape when the contract is used: the
same `payment_sessions` split fields are written, and settlement is still confirmed from the network
rather than from a button press.

### Calling it manually to check the deployment

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source customer \
  --network testnet \
  -- is_settled --payment_id DEMO-1
```

The Stellar Asset Contract address for a classic asset (needed as `token`) is:

```bash
stellar contract id asset --asset TESTGBP:$TESTGBP_ISSUER --network testnet
stellar contract id asset --asset native --network testnet
```

---

## 4. Environment variables

| Variable                          | Required | Notes                                             |
| --------------------------------- | -------- | ------------------------------------------------- |
| `EXPO_PUBLIC_BILT_URL`            | yes      | injected automatically by Bilt Cloud              |
| `EXPO_PUBLIC_BILT_ANON_KEY`       | yes      | injected automatically by Bilt Cloud              |
| `EXPO_PUBLIC_STELLAR_HORIZON_URL` | no       | defaults to `https://horizon-testnet.stellar.org` |
| `EXPO_PUBLIC_SOROBAN_RPC_URL`     | no       | defaults to `https://soroban-testnet.stellar.org` |
| `EXPO_PUBLIC_STELLAR_CONTRACT_ID` | no       | set after deploying the contract                  |

Never commit secrets. Any platform-controlled signing key belongs in server-side edge function
secrets only — the app itself needs none, because the customer's wallet signs.

---

## 5. Checklist before the demo

- [ ] Freighter installed and set to **Testnet**
- [ ] Customer wallet funded (and holding TESTGBP if you configured it)
- [ ] Merchant receiving wallet set in Onboarding and **funded**
- [ ] Platform wallet set in Settings and **funded**
- [ ] Platform fee `75` bps (0.75%)
- [ ] Public payment base URL reachable from the scanning device
- [ ] `£10.00` / `TABLE-7` payment created, QR scanned on the second device
- [ ] Transaction visible on `stellar.expert` Testnet with both split operations
