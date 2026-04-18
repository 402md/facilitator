# API reference — discovery and bazaar

The bazaar is the public directory of sellers registered with this facilitator. Agents use it to find paywalled resources; humans use the analytics endpoints to understand traffic.

All endpoints under this group share a rate limit of **200 requests per minute per IP**.

## `GET /discovery/resources`

List paywalled resources registered in the bazaar. This is the main discovery endpoint — agents call it to find services matching a query.

### Query parameters

| Param     | Type   | Default | Description                                  |
| --------- | ------ | ------- | -------------------------------------------- |
| `q`       | string | —       | Substring to match against the resource URL. |
| `network` | string | —       | Filter by CAIP-2.                            |
| `sort`    | string | `uses`  | `uses` or `volume`.                          |
| `limit`   | string | `20`    | Clamped to `[1, 100]`.                       |
| `offset`  | string | `0`     | Pagination offset.                           |

### Response `200 OK`

| Field       | Type   | Description               |
| ----------- | ------ | ------------------------- |
| `resources` | array  | One entry per resource.   |
| `total`     | number | Total matching resources. |
| `limit`     | number | Echoed.                   |
| `offset`    | number | Echoed.                   |

Each `resources[]` entry:

| Field         | Type           | Description                                               |
| ------------- | -------------- | --------------------------------------------------------- |
| `resource`    | string         | URL of the paywalled endpoint.                            |
| `type`        | string         | Always `"http"` for now.                                  |
| `description` | string \| null | Seller-supplied description.                              |
| `accepts`     | array          | `{ scheme, network, payTo, amount }` per accepted method. |
| `useCount`    | number         | All-time use count.                                       |
| `totalVolume` | string         | All-time volume in base units.                            |
| `lastUpdated` | string \| null | ISO-8601.                                                 |

## `GET /bazaar/stats`

Aggregate statistics for a time window.

### Query parameters

| Param    | Default | Values            |
| -------- | ------- | ----------------- |
| `window` | `7d`    | `1d`, `7d`, `30d` |

### Response `200 OK`

| Field              | Type   | Description                                |
| ------------------ | ------ | ------------------------------------------ |
| `window`           | string | Echoed.                                    |
| `chainsActive`     | number | Chains with at least one tx in the window. |
| `chainsSupported`  | number | Chains enabled on the relay.               |
| `uniqueRoutes`     | number | Distinct buyer/seller network pairs.       |
| `crossChainRoutes` | number | Of those, how many cross chains.           |
| `sameChainRoutes`  | number | And how many stay on-chain.                |
| `totalVolume`      | string | Gross volume in base units.                |
| `txCount`          | number | Settled transactions.                      |
| `protocolSplit`    | object | `{ "x402": n, "mpp": m, … }`.              |
| `typeSplit`        | object | `{ same_chain: n, cross_chain: m }`.       |

Cached for 60 s per window.

## `GET /bazaar/routes`

All buyer → seller network pairs with their stats.

### Query parameters

| Param    | Default | Values            |
| -------- | ------- | ----------------- |
| `window` | `7d`    | `1d`, `7d`, `30d` |

### Response `200 OK`

```json
{
  "window": "7d",
  "routes": [
    {
      "buyerNetwork": "eip155:8453",
      "sellerNetwork": "stellar:pubnet",
      "txCount": 128,
      "volume": "128000000",
      "isCrossChain": true
    }
  ]
}
```

Cached for 60 s.

## `GET /bazaar/resources`

Ranked resources with windowed and all-time counters. Use this instead of `/discovery/resources` when you need window-scoped rankings.

### Query parameters

| Param     | Default | Description         |
| --------- | ------- | ------------------- |
| `window`  | `7d`    | `1d`, `7d`, `30d`.  |
| `rank`    | `uses`  | `uses` or `volume`. |
| `network` | —       | CAIP-2 filter.      |
| `q`       | —       | URL substring.      |
| `limit`   | `20`    | `[1, 100]`.         |
| `offset`  | `0`     |                     |

### Response `200 OK`

| Field    | Type   | Description       |
| -------- | ------ | ----------------- |
| `window` | string |                   |
| `items`  | array  | Ranked resources. |
| `total`  | number |                   |

Each `items[]` entry adds to the shape of `/discovery/resources` two more fields:

| Field              | Type   | Description                |
| ------------------ | ------ | -------------------------- |
| `windowedUseCount` | number | Use count inside `window`. |
| `windowedVolume`   | string | Volume inside `window`.    |

Cached for 60 s per query.

## `GET /bazaar/sellers`

Ranked sellers (merchants) — useful for a public leaderboard.

### Query parameters

| Param     | Default  | Description                                    |
| --------- | -------- | ---------------------------------------------- |
| `window`  | `7d`     | `1d`, `7d`, `30d`.                             |
| `rank`    | `volume` | `volume` or `tx_count`.                        |
| `network` | —        | CAIP-2 filter on the seller's primary network. |
| `limit`   | `20`     | `[1, 100]`.                                    |
| `offset`  | `0`      |                                                |

### Response `200 OK`

```json
{
  "window": "7d",
  "items": [
    {
      "merchantId": "hb-a1b2c3",
      "primaryNetwork": "stellar:pubnet",
      "txCount": 42,
      "volume": "42000000",
      "resourceCount": 3,
      "firstSeenAt": "2026-03-14T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

Cached for 60 s.

## `GET /bazaar/transactions`

Filterable transaction log. Useful for a seller-facing dashboard that wants to show recent settlements.

### Query parameters

| Param           | Description                    |
| --------------- | ------------------------------ |
| `window`        | `1d`, `7d`, `30d`              |
| `merchantId`    | Filter by seller.              |
| `buyerNetwork`  | CAIP-2.                        |
| `sellerNetwork` | CAIP-2.                        |
| `status`        | e.g. `settled`, `pending`.     |
| `protocol`      | e.g. `x402`, `mpp`.            |
| `type`          | `same_chain` or `cross_chain`. |
| `limit`         | default `20`, max `100`.       |
| `offset`        | default `0`.                   |

### Response `200 OK`

| Field    | Type   | Description   |
| -------- | ------ | ------------- |
| `items`  | array  | Transactions. |
| `total`  | number |               |
| `limit`  | number |               |
| `offset` | number |               |

Each item:

| Field           | Type                              |
| --------------- | --------------------------------- |
| `id`            | string                            |
| `type`          | `"same_chain"` \| `"cross_chain"` |
| `protocol`      | string \| null                    |
| `status`        | string                            |
| `buyerNetwork`  | string                            |
| `sellerNetwork` | string                            |
| `merchantId`    | string \| null                    |
| `grossAmount`   | string                            |
| `netAmount`     | string \| null                    |
| `gasAllowance`  | string \| null                    |
| `pullTxHash`    | string \| null                    |
| `burnTxHash`    | string \| null                    |
| `mintTxHash`    | string \| null                    |
| `createdAt`     | ISO-8601 \| null                  |
| `settledAt`     | ISO-8601 \| null                  |

Cached for 60 s per query.

## `GET /bazaar/cost-comparison`

Compares the Facilitator's flat gas allowance to a percentage-based pricing model on a given route. Intended for marketing / positioning, not for runtime fee calculation — use `GET /bridge/fees` for that.

### Query parameters

| Param           | Required | Description |
| --------------- | -------- | ----------- |
| `buyerNetwork`  | yes      | CAIP-2.     |
| `sellerNetwork` | yes      | CAIP-2.     |

### Response `200 OK`

```json
{
  "buyerNetwork": "eip155:8453",
  "sellerNetwork": "stellar:pubnet",
  "tiers": [
    {
      "amount": "100000000000",
      "cctpAllowance": "500",
      "percentAlternative": "1000000100",
      "savingsVsPercent": "999999600"
    }
  ],
  "notes": {
    "cctpSource": "gas-schedule.ts",
    "percentAssumption": "1% + $0.10 market-maker spread baseline"
  }
}
```

### Errors

| Status | `error`                | Cause                                      |
| ------ | ---------------------- | ------------------------------------------ |
| `400`  | validation             | Missing `buyerNetwork` or `sellerNetwork`. |
| `404`  | `ROUTE_NOT_CONFIGURED` | No gas schedule for this pair.             |
| `429`  | `RATE_LIMIT`           |                                            |
