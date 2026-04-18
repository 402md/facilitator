# 402md Facilitator Documentation

Cross-chain USDC settlement for agentic payments. Buyer pays on any supported chain, seller receives on theirs.

This documentation is organized around the [Diátaxis](https://diataxis.fr) framework. Pick the quadrant that matches what you need right now.

| I want to…                                                  | Go to                         |
| ----------------------------------------------------------- | ----------------------------- |
| **Learn** by following a guided, end-to-end example         | [Tutorials](./tutorials/)     |
| **Solve** a specific problem with step-by-step instructions | [How-to guides](./how-to/)    |
| **Look up** exact API fields, env vars, chains, error codes | [Reference](./reference/)     |
| **Understand** why the system is designed this way          | [Explanation](./explanation/) |

## Quick links by audience

**I'm a seller integrating x402 or MPP.**
Start with the [first payment tutorial](./tutorials/01-first-cross-chain-payment.md), then bookmark the [API reference](./reference/api/overview.md) and the [seller how-to guides](./how-to/sellers/).

**I'm operating a self-hosted facilitator.**
Read [deploy relay and worker](./how-to/operations/deploy-relay-and-worker.md) and the [environment variables reference](./reference/environment-variables.md). Keep the [monitoring guide](./how-to/operations/monitor-workflows-in-temporal.md) handy.

**I'm contributing to the repo.**
Start with [set up dev environment](./how-to/contributors/set-up-dev-environment.md) and the [architecture explanation](./explanation/architecture.md).

**I'm evaluating the project.**
Read the [architecture explanation](./explanation/architecture.md), then [why CCTP V2](./explanation/why-cctp-v2.md) and [non-custodial model](./explanation/non-custodial-model.md).

## Contents

### Tutorials — learn by doing

- [Your first cross-chain payment](./tutorials/01-first-cross-chain-payment.md)
- [Build a paywalled API with x402](./tutorials/02-paywalled-api-with-x402.md)

### How-to — solve a specific problem

- **For sellers:** [register](./how-to/sellers/register-and-get-addresses.md), [accept multiple chains](./how-to/sellers/accept-multiple-chains.md), [use MPP on Stellar](./how-to/sellers/use-mpp-on-stellar.md), [check settlement status](./how-to/sellers/check-settlement-status.md), [top up with on-ramp](./how-to/sellers/top-up-with-onramp.md)
- **For operators:** [run the local stack](./how-to/operations/run-local-stack.md), [deploy relay and worker](./how-to/operations/deploy-relay-and-worker.md), [monitor Temporal workflows](./how-to/operations/monitor-workflows-in-temporal.md), [trigger circuit breakers](./how-to/operations/trigger-circuit-breakers.md)
- **For contributors:** [set up dev environment](./how-to/contributors/set-up-dev-environment.md), [add a new EVM chain](./how-to/contributors/add-a-new-evm-chain.md), [write a network adapter](./how-to/contributors/write-a-new-network-adapter.md), [run the demo](./how-to/contributors/run-the-demo.md)

### Reference — look it up

- [API overview](./reference/api/overview.md)
- API endpoints: [sellers](./reference/api/sellers.md) · [settlements](./reference/api/settlements.md) · [MPP](./reference/api/mpp.md) · [discovery (bazaar)](./reference/api/discovery.md) · [on-ramp](./reference/api/onramp.md) · [health](./reference/api/health.md)
- [Supported chains](./reference/chains.md)
- [Fees and gas schedule](./reference/fees.md)
- [Environment variables](./reference/environment-variables.md)
- [Error codes](./reference/error-codes.md)
- [CLI and scripts](./reference/cli-scripts.md)

### Explanation — understand the design

- [Architecture overview](./explanation/architecture.md)
- [Why CCTP V2](./explanation/why-cctp-v2.md)
- [Non-custodial settlement (Model A)](./explanation/non-custodial-model.md)
- [x402 and MPP — dual protocol](./explanation/dual-protocol-x402-mpp.md)
- [Temporal workflows and durability](./explanation/temporal-workflows.md)
- [Security model](./explanation/security-model.md)
- [`merchantId` as a primitive](./explanation/merchant-id-as-primitive.md)
