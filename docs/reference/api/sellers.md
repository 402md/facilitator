# API reference — sellers

Endpoints that sellers use to register and advertise their payment acceptance.

## `POST /register`

Register a seller wallet and receive a `merchantId` plus the Facilitator's receiving address on every enabled chain.

**Rate limit:** 3 requests per hour per IP.

### Request body

| Field     | Type   | Required | Validation                           | Description                                                                   |
| --------- | ------ | -------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `wallet`  | string | yes      | ≥ 10 chars                           | Seller's wallet address on `network`. EVM `0x…`, Solana base58, Stellar `G…`. |
| `network` | string | yes      | ≥ 3 chars, must be an enabled CAIP-2 | The chain the seller will receive settlement on.                              |

### Response `201 Created`

| Field                  | Type   | Description                                                         |
| ---------------------- | ------ | ------------------------------------------------------------------- |
| `merchantId`           | string | Stable identifier for this seller. Use it in every subsequent call. |
| `wallet`               | string | Echoed seller wallet.                                               |
| `network`              | string | Echoed seller network (CAIP-2).                                     |
| `facilitatorAddresses` | object | Map of CAIP-2 → facilitator receiving address on that chain.        |
| `codeSnippet`          | string | Ready-to-paste JavaScript showing how to wire `@x402/express`.      |

### Errors

| Status | `error`               | Cause                                                                                                                     |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `400`  | validation            | Missing or invalid `wallet` / `network`.                                                                                  |
| `400`  | `UNSUPPORTED_NETWORK` | `network` is not enabled on this relay. Response `details` include `supportedNetworks` and an `example` payload to retry. |
| `429`  | `RATE_LIMIT`          | Too many registrations from this IP.                                                                                      |

### Example

```bash
curl -X POST https://api.402md.com/register \
  -H "Content-Type: application/json" \
  -d '{ "wallet": "GSELLER...", "network": "stellar:pubnet" }'
```

```json
{
  "merchantId": "hb-a1b2c3",
  "wallet": "GSELLER...",
  "network": "stellar:pubnet",
  "facilitatorAddresses": {
    "eip155:8453": "0xFacilitatorBase",
    "solana:mainnet": "FacilitatorSolAddr",
    "stellar:pubnet": "GFacilitatorStellarAddr"
  },
  "codeSnippet": "…"
}
```

## `GET /discover`

Look up a seller's payment configuration. Useful as a cacheable substitute for embedding the full `accepts` array in your app.

**Rate limit:** 100 requests per minute per IP.

### Query parameters

| Param        | Required | Description                        |
| ------------ | -------- | ---------------------------------- |
| `merchantId` | yes      | The `merchantId` from `/register`. |

### Response `200 OK`

| Field                          | Type    | Description                                        |
| ------------------------------ | ------- | -------------------------------------------------- |
| `merchantId`                   | string  |                                                    |
| `acceptedNetworks`             | array   | One entry per enabled chain (see below).           |
| `sellerNetwork`                | string  | The seller's own chain (where they receive).       |
| `fees.platform`                | string  | Human-readable platform fee (e.g. `"0%"`).         |
| `fees.gasAllowance`            | string  | Pointer to `/bridge/fees` for exact values.        |
| `fees.sameChain`               | string  | Same-chain gas allowance note.                     |
| `estimatedSettlement.standard` | string  | Human estimate ("~5–30s" or similar).              |
| `estimatedSettlement.note`     | string  | Longer explanation.                                |
| `gasFree`                      | boolean | `true` if the buyer does not pay gas (x402 model). |

Each entry of `acceptedNetworks`:

| Field               | Type    | Description                                                                |
| ------------------- | ------- | -------------------------------------------------------------------------- |
| `network`           | string  | CAIP-2 of the accepting chain.                                             |
| `payTo`             | string  | Facilitator receiving address on that chain.                               |
| `asset`             | string  | Always `"USDC"`.                                                           |
| `maxTimeoutSeconds` | number  | Max age of a signed authorization.                                         |
| `extra.merchantId`  | string  | Pre-filled for you — copy into the `extra` you expose via `@x402/express`. |
| `bridge`            | boolean | `true` if paying on this network bridges via CCTP to the seller's chain.   |

### Errors

| Status | `error`            | Cause                 |
| ------ | ------------------ | --------------------- |
| `400`  | validation         | Missing `merchantId`. |
| `404`  | `SELLER_NOT_FOUND` | Unknown `merchantId`. |
| `429`  | `RATE_LIMIT`       |                       |

### Example

```bash
curl "https://api.402md.com/discover?merchantId=hb-a1b2c3"
```

## `GET /supported`

List every x402 version, scheme, and network the relay currently accepts. Use this at boot time to decide which `accepts` entries to declare.

**No rate limit.**

### Response `200 OK`

```json
{
  "kinds": [
    { "x402Version": 2, "scheme": "exact", "network": "eip155:8453" },
    { "x402Version": 2, "scheme": "exact", "network": "solana:mainnet" },
    { "x402Version": 2, "scheme": "exact", "network": "stellar:pubnet" }
  ],
  "extensions": [],
  "signers": {}
}
```

| Field        | Type   | Description                                                                              |
| ------------ | ------ | ---------------------------------------------------------------------------------------- |
| `kinds`      | array  | Each entry = `{ x402Version, scheme, network }`. Currently the only scheme is `"exact"`. |
| `extensions` | array  | Reserved for future x402 extensions.                                                     |
| `signers`    | object | Reserved.                                                                                |

## `GET /.well-known/x402.json`

Standard x402 capability manifest. Used by x402-aware agents to discover the Facilitator.

**No rate limit.**

### Response `200 OK`

```json
{
  "version": "2",
  "facilitator": {
    "name": "402md",
    "url": "https://api.402md.com",
    "networks": ["eip155:8453", "solana:mainnet", "stellar:pubnet"],
    "bridgeProvider": "circle-cctp-v2",
    "crossChain": true
  }
}
```

| Field                        | Type    | Description                                      |
| ---------------------------- | ------- | ------------------------------------------------ |
| `version`                    | string  | x402 protocol version (currently `"2"`).         |
| `facilitator.name`           | string  | Display name.                                    |
| `facilitator.url`            | string  | Canonical URL of this facilitator.               |
| `facilitator.networks`       | array   | Enabled CAIP-2 networks.                         |
| `facilitator.bridgeProvider` | string  | Always `"circle-cctp-v2"`.                       |
| `facilitator.crossChain`     | boolean | `true` — this facilitator bridges across chains. |
