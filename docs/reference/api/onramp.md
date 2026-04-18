# API reference — on-ramp

List fiat-to-USDC providers that will deliver USDC to a specified wallet on a specified chain. This endpoint is informational — it does not move funds or hold KYC state. It exists so agents and sellers can surface on-ramp options without embedding provider lists.

## `GET /onramp`

**Rate limit:** 30 requests per minute per IP.

### Query parameters

| Param           | Default          | Description                                                                       |
| --------------- | ---------------- | --------------------------------------------------------------------------------- |
| `network`       | `stellar:pubnet` | Target CAIP-2.                                                                    |
| `walletAddress` | —                | Destination wallet. When provided, providers may pre-fill it into their `kycUrl`. |

### Response `200 OK`

| Field       | Type   | Description                                                              |
| ----------- | ------ | ------------------------------------------------------------------------ |
| `providers` | array  | Matching providers.                                                      |
| `manual`    | string | Human-readable instructions for a manual transfer when no provider fits. |

Each `providers[]` entry:

| Field     | Type   | Description                                                                                           |
| --------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `name`    | string | Provider display name (e.g. `"Bridge.xyz"`).                                                          |
| `method`  | string | `"pix"`, `"cash"`, etc.                                                                               |
| `regions` | array  | ISO country codes where the provider operates.                                                        |
| `kycUrl`  | string | HTTPS URL to begin onboarding. May include `?dest=<walletAddress>` when `walletAddress` was supplied. |
| `fees`    | string | Human-readable fee summary (e.g. `"~1%"`).                                                            |

### Example

```bash
curl "https://api.402md.com/onramp?network=stellar:pubnet&walletAddress=GSELLER..."
```

```json
{
  "providers": [
    {
      "name": "Bridge.xyz",
      "method": "pix",
      "regions": ["BR"],
      "kycUrl": "https://bridge.xyz/onboard?dest=GSELLER...",
      "fees": "~1%"
    },
    {
      "name": "MoneyGram Ramps",
      "method": "cash",
      "regions": ["BR", "MX", "CO", "AR"],
      "kycUrl": "https://ramps.moneygram.com",
      "fees": "varies"
    }
  ],
  "manual": "Send USDC directly from any exchange supporting stellar:pubnet."
}
```

### Errors

| Status | `error`      | Cause |
| ------ | ------------ | ----- |
| `429`  | `RATE_LIMIT` |       |

## Adding providers

The provider list is currently hard-coded in the relay at `packages/relay/src/onramp/onramp.service.ts`. To propose a new provider, open a pull request updating that file. Future versions will move this to a database-backed registry.
