#!/bin/bash
# stripe_test.sh - dry-run Stripe payment test (requires STRIPE_API_KEY env var)
set -euo pipefail
if [ -z "${STRIPE_API_KEY:-}" ]; then
  echo "STRIPE_API_KEY not set. Exiting."
  exit 2
fi
# This script does a safe test using Stripe's test mode. It only creates a PaymentIntent with amount=50 (cents).
response=$(curl -s -X POST https://api.stripe.com/v1/payment_intents \
  -u "$STRIPE_API_KEY:" \
  -d amount=50 \
  -d currency=usd \
  -d "payment_method_types[]"=card)
echo "Response: $response"
# Note: do not store keys in repo. Use environment variables or Bitwarden.
