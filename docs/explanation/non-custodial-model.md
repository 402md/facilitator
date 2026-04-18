# Non-custodial settlement (Model A)

The facilitator never custodies seller funds. This is deliberate, and it constrains the design in ways that are worth understanding before you build on top of it.

## What "non-custodial" means here

A custodial settlement service sits between buyer and seller funds. It receives USDC, holds it on behalf of the seller, and pays out on request. The seller trusts the service with their balance. Traditional payment processors work this way.

The 402md Facilitator does not. For every payment:

1. Buyer signs an authorization — a cryptographic promise that the Facilitator can pull an exact amount from their wallet.
2. Facilitator pulls the amount.
3. Facilitator retains a fixed gas allowance (USDC).
4. Facilitator **burns the net amount on CCTP V2**.
5. Circle mints the same net amount on the destination chain, **directly to the seller's wallet**.

The facilitator holds the net USDC for at most the duration of steps 3–4 — seconds on Stellar/Solana, minutes on EVM. The mint step is not a "payout" — the Facilitator is never the recipient. CCTP writes to the seller's address directly.

## The `CctpForwarder` trick for Stellar

On EVM chains, CCTP's default mint recipient is the address encoded at burn time. When the destination is Stellar, encoding a Stellar address directly does not work — the mint happens on Stellar, where the CCTP-native minter cannot call arbitrary contracts.

So the worker uses `depositForBurnWithHook`:

- `mintRecipient` is the Circle-deployed `CctpForwarder` contract on the destination (still an EVM-side concept for the protocol, but semantically the forwarder).
- `hookData` carries the seller's Stellar address.

When Circle attests and the destination mint runs, `CctpForwarder` atomically mints to itself and forwards the USDC to the Stellar address. The facilitator never touches the funds.

This is one transaction on destination, with no intermediate custody.

## What the Facilitator **does** hold

- **Gas allowances**, accumulated from many payments. The allowance is USDC; it is spent at the margin to fund new on-chain transactions. Think of this as the operator's working capital, not seller funds.
- **Facilitator's own funds for gas top-ups.** The operator must keep ETH/SOL/XLM on each chain to pay gas for the `pull`, `burn`, and `mint` transactions. This is operator money, not seller money.

Neither of these is seller balance. If the Facilitator key is compromised, the blast radius is (a) any allowance accrued since the last sweep, and (b) the daily volume limit's worth of in-flight payments. See [security model](./security-model.md) for the full threat model.

## What the Facilitator does **not** hold

- **No seller balance, ever.** There is no concept of "your seller balance with 402md". There is no "withdraw" endpoint. Settlements flow through — they do not accumulate.
- **No buyer deposits.** Buyers do not pre-fund anything. They sign per-payment authorizations against their own wallet.

This is why there is no KYC for sellers — regulators treat custodial money transmission very differently from non-custodial infrastructure. A non-custodial rail is closer to a router than to a bank.

## The pre-approval step on EVM

EVM has one quirk: USDC's `transferWithAuthorization` (EIP-3009) lets the Facilitator pull from the buyer without the buyer's explicit `approve` call. Good — zero friction for buyers.

But the Facilitator itself needs to approve `TokenMessengerV2` to spend USDC from the Facilitator wallet. This is a one-time per-EVM-chain step, done during facilitator setup. It is a standard ERC-20 approval for `2^256 − 1` USDC. See [supported chains](../reference/chains.md#one-time-usdc-approval-per-evm-chain).

This approval gives `TokenMessengerV2` permission to burn USDC owned by the Facilitator wallet. No other contract can access those funds. CCTP is audited by Circle and an upstream maintainer.

## Why this shape

Custody would let us batch payments and absorb gas into a float — the "Model B" referenced in the rules. It would also:

- require a custody license in every jurisdiction we operate in;
- expose seller balances to a single point of failure (the operator's security posture);
- make account reconciliation a permanent operational burden;
- make the 0% fee unsustainable (custody costs money).

Non-custodial inherits CCTP's atomicity and Circle's regulatory surface. We piggyback on both, and focus the product on the routing layer above.

## Model B, later

The rules reference "Model B" — a filler/pre-funding model where the Facilitator fronts USDC on the destination, settles in batches, and reconciles on source chains. This would reduce latency on EVM routes, but requires custody, reserves, and monitoring. We have deliberately not built it. If volume justifies it later, it would be a separate service — not a replacement for Model A.

## Next

- [Security model](./security-model.md) — what a compromise looks like and what it cannot do.
- [Supported chains](../reference/chains.md) — the one-time approval step per EVM chain.
- [Fees](../reference/fees.md) — why the gas allowance can be flat.
