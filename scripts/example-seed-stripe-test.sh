#!/bin/bash
# Example: Seed Stripe test keys for development

echo "🔐 Seeding Stripe Test Configuration"
echo "======================================"
echo ""

npm run db:owner:payment:quick -- \
  --provider=stripe \
  --name="Development Stripe" \
  --pk=pk_test_51ABCxyzDEFghiJKLmno123456789PQRstuvWXYZ \
  --sk=sk_test_51ABCxyzDEFghiJKLmno123456789PQRstuvWXYZ \
  --webhook=whsec_test123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef \
  --env=sandbox \
  --currency=USD \
  --currencies=USD,NGN,GHS \
  --default=true \
  --notes="Development and testing environment"

echo ""
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "1. Verify: curl -X POST http://localhost:9002/api/owner/payment-configs/1/verify"
echo "2. View: npm run db:owner:studio"
echo "3. Test marketplace purchase"
