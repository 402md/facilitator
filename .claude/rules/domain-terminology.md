# Domain Terminology — 402md Bridge

Use these terms consistently across all documents.

| Term | Correct Usage | Never |
| ---- | ------------- | ----- |
| USDC | Always a string value, never float | `parseFloat("0.05")`, `Number(usdc)` |
| CCTP V2 | "Circle CCTP V2" or "CCTP V2" | "CCTP v1", "CCTP" alone (ambiguous) |
| x402 | Lowercase "x", always "x402" | "X402", "x-402" |
| MPP | "Machine Payments Protocol (MPP)" on first use, "MPP" after | "Machine Payment Protocol" (singular) |
| Facilitator | The relay that mediates x402 payments | "Middleware", "proxy" |
| Bridge | Cross-chain settlement extension of the facilitator | "Swap", "exchange" |
| Seller | API provider who receives USDC | "Vendor", "merchant" |
| Buyer / Agent | AI agent that pays for skills | "Customer", "user" (ambiguous) |
| Settlement | Final delivery of USDC to the seller's chain | "Transfer", "payment" (too vague) |
| Skill | API monetized via x402, defined by SKILL.md | "Service", "endpoint" |
| Model A | Non-custodial: receive → retain gas allowance → CCTP burn net → mint directly to seller | "Basic model" |
| Model B | Filler model with pre-funding + batch settle | "Advanced model" |
