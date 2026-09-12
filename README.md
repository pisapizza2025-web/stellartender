# Stellar Flexi Payment

**Keep your POS. Change the payment rail.**

Stellar Flexi Payment is an independent alternative payment method that a merchant runs
_alongside_ the POS they already use. It is not a POS, not an exchange and not a card processor.

The existing POS keeps doing orders, menu, inventory, VAT, staff, receipts, reporting and kitchen
operations. This app does one job: take a payment on the Stellar network and tell the merchant when
it has really settled, so they can close the sale in their POS using an external / custom tender.

```
Cash   |   Card   |   Stellar Flexi Payment
```

> **TESTNET DEMO — NO REAL MONEY.** Every transaction is real Stellar **Testnet** activity. Mainnet
> is never used. TESTGBP is a demo testnet asset, not real, regulated or redeemable GBP.

---

## 1. What it does

| Actor    | Experience                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merchant | Signs in, enters `£48.20` + optional order reference, gets a QR code and NFC-ready link, watches the status change to `PAYMENT SETTLED` on its own, then records the sale in their own POS. |
| Customer | Scans the QR, sees the merchant name and amount due, connects their own Stellar wallet, signs in the wallet, sees `✓ PAYMENT COMPLETE`. No account, no card details, no crypto jargon.      |

The merchant never picks an asset, a network or a fee. The customer never types a Stellar address.

## 2. Architecture

```
EXISTING POS  ──  £48.20 order
      │
      ▼
Merchant app  ──  POST payment-create (edge function)
      │             • server generates the public token
      │             • server owns amount, asset, fee split, expiry
      ▼
payment_sessions row  (status: pending)
      │
      ├── QR / NFC URL  →  /pay/<TOKEN>
      ▼
Customer page  ──  payment-public (anonymous edge function)
      │             • get     → safe public view of the session
      │             • status  → wallet_connected / authorising / submitted / failed
      │             • settle  → verifies the tx on Horizon, then marks settled
      ▼
Stellar Testnet  ──  real signed transaction
      │
      ▼
Merchant terminal polls the session → ✓ PAYMENT SETTLED
      │
      ▼
Merchant records "Stellar Flexi Payment" as an external tender in their POS
```

### Repository layout

```
app/                       Expo Router screens
  index.tsx                auth gate → login / onboarding / dashboard
  login.tsx                merchant email + 6-digit code sign in
  onboarding.tsx           business name, existing POS, Stellar receiving wallet
  (tabs)/dashboard.tsx     today's volume, fees avoided, CREATE PAYMENT, savings dashboard
  (tabs)/new-payment.tsx   amount + order reference
  (tabs)/transactions.tsx  payment history
  (tabs)/settings.tsx      business details, platform configuration, demo links
  payment/[id].tsx         merchant payment terminal: QR, NFC URL, live status, settlement detail
  transactions/[id].tsx    transaction detail incl. fee split and tx hash
  pay/[token].tsx          CUSTOMER payment page (no login)
  pos-compatibility.tsx    "Works alongside your existing POS"
  roadmap.tsx              phases 1–5, future work clearly marked
  demo.tsx                 HACKATHON DEMO MODE
lib/stellar/               config, errors, Horizon REST client, wallet kit, classic split tx builder
lib/payments/              types, formatting, fee + savings maths, status vocabulary, flow, hooks, api
lib/store/merchant.ts      Zustand store for merchant profile + platform settings
components/                shared UI primitives (StatusPill, MoneyValue, PayQr, PosTenderCard, …)
contracts/alternative_payment/   Soroban split-payment contract (Rust)
```

### Backend (Bilt Cloud — Postgres + edge functions)

Tables, all with row level security:

| Table               | Purpose                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `merchants`         | one row per signed-in merchant: business name, existing POS, receiving wallet, card rate                          |
| `payment_sessions`  | the source of truth for a requested amount: public token, amount, asset, split, status, expiry, tx hash           |
| `transactions`      | settled payments: gross / merchant / fee amounts, payer address, tx hash, ledger                                  |
| `platform_settings` | single row: platform fee bps, platform wallet, asset config, XLM rate, settlement cost, contract id, pay base URL |

Edge functions:

| Function         | Auth         | Job                                                                                                                                                                                                             |
| ---------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payment-create` | merchant JWT | validates the amount **server-side**, resolves the settlement asset, computes the fee split, generates a cryptographically random public token, sets the expiry                                                 |
| `payment-public` | anonymous    | `get` returns only non-sensitive fields for a token; `status` advances the live status; `settle` fetches the transaction from Horizon, checks it, then marks the session settled and writes the transaction row |

Settlement is never set because a button was pressed. `payment-public → settle` verifies the
transaction on Horizon (success, correct destination, correct amount) before anything is marked paid,
and a session that is already settled cannot be settled again.

## 3. How the Stellar payment works

The customer's wallet signs a **single Stellar Testnet transaction containing two payment
operations**:

1. merchant amount → merchant receiving wallet
2. platform fee → platform wallet

Both operations are in one transaction, so the split either happens completely or not at all — the
same atomicity the Soroban contract gives, using classic Stellar operations that need no deployment.
This is the agreed fallback while the contract is not yet deployed; see
[SETUP.md](./SETUP.md) for switching to the contract.

Fee: **75 bps (0.75%)** by default, configurable in Settings → Platform configuration (and therefore
never hard-coded to one rate). On £100: merchant £99.25, Stellar Flexi Payment £0.75.

Asset resolution, in order:

1. **TESTGBP** — used when a TESTGBP issuer is configured and both the merchant and the payer hold a
   trustline. 1 TESTGBP is _displayed_ as £1 for the demonstration only.
2. **XLM Testnet fallback** — used otherwise. Both values are shown separately, never as if XLM were
   GBP:
   ```
   Commercial order      £48.20
   Testnet settlement    248.4536 XLM
   ```

## 4. Wallet signing

Signing happens **inside the customer's own wallet**. The app never sees, asks for or stores a
secret key, seed phrase, recovery phrase or private key, and no merchant key is kept in browser
storage.

Wallet connection uses Stellar Wallets Kit with two adapters bundled: **Freighter** (browser
extension) and **Albedo** (no install needed). Those wallets are browser technologies, so the customer payment page
signs on **web**. Opened in a native build, the page shows the amount and asks the customer to open
the link in a browser to pay — it never pretends to sign.

## 5. Install and run

```bash
npm install
npx expo start --web     # customer + merchant flows, wallet signing available
npx expo start           # iOS / Android; merchant flows, payment page is read-only
```

The Bilt Cloud URL and anon key are injected automatically as `EXPO_PUBLIC_BILT_URL` and
`EXPO_PUBLIC_BILT_ANON_KEY`. Nothing else is required to boot.

Optional environment variables (defaults are the public Testnet endpoints):

| Variable                          | Default                                  |
| --------------------------------- | ---------------------------------------- |
| `EXPO_PUBLIC_STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org`    |
| `EXPO_PUBLIC_SOROBAN_RPC_URL`     | `https://soroban-testnet.stellar.org`    |
| `EXPO_PUBLIC_STELLAR_CONTRACT_ID` | empty — set after deploying the contract |

Platform configuration that changes per demo (platform wallet, fee bps, TESTGBP issuer, XLM rate,
public pay base URL) lives in the database and is edited in **Settings**, not in code.

## 6. Configure Stellar Testnet before the demo

1. Install **Freighter** in your browser and switch its network to **Testnet**.
2. Fund the customer wallet from Freighter's own Testnet funding (Friendbot).
3. Sign in to the app, complete onboarding with a **merchant receiving wallet** (Testnet `G…`).
4. In **Settings → Platform configuration** set the **platform wallet** (a second Testnet `G…`) and
   confirm the fee is `75` bps (0.75%).
5. In **Demo mode**, fund the merchant and platform wallets with Friendbot. An unfunded destination
   cannot receive a payment.
6. Set **Public payment base URL** in Settings to the URL your phone can reach (for example the
   Expo web URL), so the QR points at a reachable `/pay/<TOKEN>`.

## 7. The £10 demo

1. Merchant signs in. Profile: **Mario's Kitchen**, existing POS **Square** (Demo mode loads this in
   one press).
2. **NEW PAYMENT** → `£10.00`, order `TABLE-7` → **CREATE FLEXI PAYMENT**.
3. The merchant terminal shows the amount, the order, `WAITING FOR PAYMENT`, a QR code, the NFC-ready
   URL and a 5-minute countdown.
4. Scan the QR on another device (or press **Open payment page**).
5. Customer sees **Mario's Kitchen**, **£10.00**, order TABLE-7, the settlement review and
   **CONNECT WALLET & PAY**.
6. Freighter opens; the customer signs. The merchant screen moves through `CUSTOMER CONNECTED` →
   `PAYMENT PROCESSING…`.
7. Once Horizon confirms, both screens show **✓ PAYMENT SETTLED / ✓ PAYMENT COMPLETE** with the
   transaction hash and the 0.75% split (merchant amount and Stellar Flexi Payment fee shown
   separately, to settlement precision).
8. The merchant screen says: \*Record this transaction in Square as **Stellar Flexi Payment\***.
9. The payment appears in **Transactions**, and the **savings dashboard** updates.

### Verify on Stellar Testnet

Press **VIEW STELLAR TRANSACTION**, or open
`https://stellar.expert/explorer/testnet/tx/<hash>` and check the two payment operations: merchant
amount to the merchant wallet, fee to the platform wallet.

## 8. Savings dashboard

Estimates only, and labelled as such in the UI:

```
Estimated traditional card fees = volume × card processing rate (default 1.75%)
Stellar Flexi Payment fees      = volume × (platform fee bps + settlement cost)
Estimated savings               = the difference
```

At the demo defaults — card 1.75% versus a 0.75% merchant fee — a £10,000 month is roughly £175 in
card fees against £75 plus negligible network cost.

Shown for **this month** and **lifetime**. The point is not the exact number: the merchant keeps the
POS they already have and pays less to get paid.

## 9. Failure states

Handled explicitly, in plain English, and never shown as paid: wallet rejected, insufficient
balance, unfunded or missing destination account, wrong network, missing TESTGBP trustline, expired
request, already settled, Horizon/RPC failure, wallet closed, transaction still pending. Retry is
offered where retrying is safe.

Payments expire after **5 minutes** with a visible countdown. An expired request cannot be paid; the
merchant creates a new one.

## 10. Security

- No bank login, password, PIN, card number, CVV, seed phrase, private key or recovery phrase is ever
  requested or stored.
- Customer signing happens in the customer's wallet. There is no permanent customer profile — the
  payer's public address is only attached to the transaction it paid.
- Amounts are validated server-side; the browser cannot change what is owed. The merchant-created
  session is the source of truth.
- Public payment tokens are cryptographically random and unguessable, and carry no merchant secrets.
- Platform secrets stay server-side in edge functions and are never committed.
- Row level security scopes every merchant to its own rows; the anonymous customer path goes only
  through the public edge function, which returns a narrow, non-sensitive view.

## 11. Known limitations

- **Testnet only.** No real money, no regulated payment service, no FCA approval, not a live payment
  service.
- **TESTGBP is a demo asset** shown at £1 for demonstration. It is not GBP.
- **The Soroban contract is written but not deployed** from this environment — deployment needs the
  Stellar CLI on your machine. Until then the app uses the real classic two-operation split payment
  described above. See [SETUP.md](./SETUP.md).
- **Wallet signing is web-first** because Stellar wallets are browser extensions.
- **Status updates are polling-based** (about every 2 seconds) rather than push; the merchant still
  never has to refresh manually.
- **No POS integrations.** Designed to operate alongside existing POS systems; native integrations
  can be added later. The merchant records the sale in their POS manually.
- The XLM/GBP demo rate is configured, not a live price feed.

## 12. Production roadmap

| Phase | Scope                                                                                     | State  |
| ----- | ----------------------------------------------------------------------------------------- | ------ |
| 1     | Independent Stellar payment sidecar: QR, payment link, manual POS external tender         | Built  |
| 2     | NFC payment launch, automatic reconciliation, POS APIs                                    | Future |
| 3     | Native Square / Lightspeed / Clover integrations                                          | Future |
| 4     | Fiat on-ramp / off-ramp, Open Banking, merchant GBP settlement                            | Future |
| 5     | Cross-border Stellar settlement, multi-currency, stablecoin settlement, automatic routing | Future |

---

**This is not a new POS. This is an alternative payment method used alongside the merchant's
existing POS.**
