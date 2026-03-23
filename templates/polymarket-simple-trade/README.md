# Polymarket Simple Trade

Minimal OpenTool starter for placing one Polymarket order with an operating wallet signer and recording the submission in store.

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
  "orderType": "GTC",
  "environment": "mainnet"
}
```
