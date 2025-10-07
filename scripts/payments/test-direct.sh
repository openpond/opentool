#!/usr/bin/env bash
set -euo pipefail

TOKEN_PAYLOAD='{"schemaVersion":1,"optionId":"402","proofType":"402","payload":{"token":"paid"}}'
TOKEN_HEADER=$(printf '%s' "$TOKEN_PAYLOAD" | base64 | tr -d '\n')

curl -i -X POST http://localhost:7000/premium_report \
  -H 'content-type: application/json' \
  -H "X-PAYMENT-PROOF: $TOKEN_HEADER" \
  -d '{"symbol":"OPN"}'
