# Polymarket Simple Trade

Minimal OpenTool starter for placing one Polymarket mainnet order with an operating wallet signer, a canonical Polymarket funder address, and `signatureType = 2`.

## Quickstart

```bash
npm install
npx opentool dev
```

## Request Example

```json
{
  "conditionId": "0xcondition",
  "tokenId": "123456789",
  "side": "BUY",
  "price": "0.52",
  "size": "10",
  "orderType": "GTC"
}
```

## Required Runtime

- `POLYMARKET_FUNDER_ADDRESS`: the user's Polymarket proxy/safe trading wallet
- Turnkey signer envs injected by the platform runtime
