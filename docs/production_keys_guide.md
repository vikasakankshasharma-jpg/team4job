# Cashfree Production Key Migration Guide

> [!IMPORTANT]
> This guide outlines how to move from **TEST** keys to **PRODUCTION** keys for Cashfree. Do NOT share these keys in public repositories or chats.

## 1. Rotate Leaked Secrets
Since your `.env.production` was committed to Git, your existing test keys might be compromised. 
1. Log in to the [Cashfree Merchant Dashboard](https://merchant.cashfree.com/).
2. Navigate to **API Keys** and generate new Production keys.
3. If you used test keys, these are less critical but should still be refreshed.

## 2. Set Firebase Secrets
Instead of using `.env` files, use Firebase Secrets to store your production keys. This ensures they are encrypted and not stored in your Git repository.

### Commands for your terminal:
```powershell
# Set Cashfree App ID
firebase apphosting:secrets:set CASHFREE_PAYMENTS_CLIENT_ID --data "your_prod_client_id"

# Set Cashfree Secret
firebase apphosting:secrets:set CASHFREE_PAYMENTS_CLIENT_SECRET --data "your_prod_client_secret"

# Set Sentry DSN
firebase apphosting:secrets:set NEXT_PUBLIC_SENTRY_DSN --data "your_sentry_dsn"
```

## 3. Verify Mode
Ensure your application logic checks for the environment and uses the correct `CASHFREE_BASE_URL`.
- **Test Mode:** `https://sandbox.cashfree.com/pg`
- **Production Mode:** `https://api.cashfree.com/pg`

You should have a check like this in your configuration:
```typescript
const CASHFREE_ENV = process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST';
```

## 4. Final Smoke Test
Before going live:
1. Use real money for a small transaction (e.g., ₹10).
2. Verify the payment status updates in your dashboard.
3. Check Sentry to ensure no errors were logged during the payment lifecycle.
