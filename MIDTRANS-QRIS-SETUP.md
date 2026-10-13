# Midtrans QRIS — Setup & Verification

Target repository: https://github.com/JfsAITechnology/jfs-ai-platform  
Production frontend: https://jfsaitechnology.github.io/jfs-ai-platform/checkout.html  
Payment result: https://jfsaitechnology.github.io/jfs-ai-platform/payment-result.html  
Supabase project: `evtkeyfjgqwarsmlzrkh`

## Implemented

- `checkout.html` requires an existing JFS AI Supabase login and loads active paid packages from `jfs_app_subscription_plans`. The backend validates the selected package and amount.
- Checkout includes `WHATSAPP-CS` (`JFS AI WhatsApp CS`). Its 30-day trial is registered and active; paid plans remain inactive until a Super Admin sets a positive price and activates them in Subscription Control. The trial/subscription guard uses the shared JFS AI login session for tenant-specific WhatsApp CS URLs.
- `midtrans-create-checkout` validates the customer session, product and package; records a unique order; creates a Snap transaction server-side; and restricts the transaction to QRIS via `enabled_payments: ["other_qris"]`.
- `midtrans-notification` verifies status directly against the Midtrans Get Status API, validates order ID/currency/amount and activates access only for accepted `settlement` or `capture` transactions.
- Payment notifications are idempotent for orders already marked `PAID`. Subscription upsert uses the database's unique current-subscription key `(user_id, app_code)`, so a paid purchase can update an existing trial/subscription row rather than failing on that unique constraint.
- `payment-result.html` reads the logged-in user's own order and reports the server-verified order state. The browser redirect itself does not activate a subscription.
- `jfs_midtrans_payment_orders`, `jfs_app_subscriptions`, and `jfs_app_subscription_plans` have Row Level Security enabled. Customer read policies restrict subscription/order rows to the owning user; active plans are publicly readable.
- Function source is tracked under `supabase/functions/midtrans-create-checkout/index.ts` and `supabase/functions/midtrans-notification/index.ts`.

## Required configuration before testing

1. Open Supabase Dashboard → Project Settings → Edge Functions → Secrets.
2. Set `MIDTRANS_SERVER_KEY` to the **Sandbox Server Key** from the matching Midtrans sandbox account. Do not send this key in chat or commit it to GitHub.
3. Set `MIDTRANS_IS_PRODUCTION` to `false` for sandbox testing. Keep it false until the full sandbox flow passes and the merchant has production approval.
4. Confirm the hosted Edge Functions have the built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` values available (Supabase supplies these in its hosted environment).
5. In the Midtrans sandbox dashboard, configure Payment Notification URL as:
   `https://evtkeyfjgqwarsmlzrkh.supabase.co/functions/v1/midtrans-notification`
6. Enable/approve the `Other QRIS` payment channel in Snap preferences / merchant configuration. The checkout intentionally shows QRIS only; it will not fall back to other payment methods.
7. Use an authenticated JFS AI test customer account to test checkout.

## Sandbox verification checklist

- [ ] Configure the Sandbox Server Key in Supabase Edge Function secrets.
- [ ] Verify the selected package price and duration in Subscription Control.
- [ ] Log in with a test customer and open `checkout.html`.
- [ ] Select a paid package and confirm an order is created.
- [ ] Confirm the hosted Midtrans checkout displays QRIS.
- [ ] Complete a sandbox QRIS transaction using Midtrans's current sandbox test flow.
- [ ] Confirm Midtrans sends the notification and the order status becomes `PAID`.
- [ ] Confirm one current `jfs_app_subscriptions` row is active for the correct user/product and references the paid order.
- [ ] Verify pending, cancelled, denied, expired, wrong-amount, or wrong-order events do not grant access.
- [ ] Test a second paid order for the same user/product and a duplicate notification to confirm renewal and idempotency.
- [ ] Capture actual screenshots from the deployed browser: package selection, Midtrans QRIS screen, and verified payment result.
- [ ] Only after sandbox checks pass, follow Midtrans's merchant approval steps and switch to production credentials/settings.

## Current verification status

The two Edge Functions have been redeployed and the database structure/RLS/indexes were inspected. The earlier implementation's subscription upsert conflicted with the database's unique `(user_id, app_code)` index; the notification function has been corrected to use that key and to ignore duplicate callbacks for orders already marked paid.

**End-to-end payment is not yet verified.** No Midtrans Server Key was provided/configured in this session, the order table currently has no payment orders, and the deployed site could not be reached from this runtime to capture live screenshots. Do not present this setup document as proof of a successful payment. After Sandbox credentials are configured, run the checklist above and capture actual browser screenshots for the merchant PDF.

## Security

- Never expose `MIDTRANS_SERVER_KEY` or the Supabase service-role key in frontend code, GitHub, screenshots, PDFs, or customer-visible logs.
- Keep `MIDTRANS_IS_PRODUCTION=false` until sandbox tests pass and production access is approved.
- Payment activation depends on the backend's direct Midtrans status verification, not a customer-controlled redirect or request payload.
