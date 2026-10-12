# Midtrans QRIS — Setup & Verification

Target repository: https://github.com/JfsAITechnology/jfs-ai-platform  
Production frontend: https://jfsaitechnology.github.io/jfs-ai-platform/checkout.html  
Supabase project: `evtkeyfjgqwarsmlzrkh`

## What is implemented

- `checkout.html`: requires an existing JFS AI Supabase login, loads active paid plans from `jfs_app_subscription_plans`, and requests an order from the server. The browser does not decide the amount.
- `payment-result.html`: shows the current order state to the logged-in owner of that order.
- Supabase Edge Function `midtrans-create-checkout`: validates the user session and active plan, records an order, and requests a Midtrans Snap transaction.
- Supabase Edge Function `midtrans-notification`: calls Midtrans Get Status API to verify the order and amount, then records a paid subscription only for `settlement` or accepted `capture`. A unique `midtrans_order_id` prevents duplicate subscription activation.
- Database table `jfs_midtrans_payment_orders`: stores order and payment state with RLS restricting reads to the order owner.
- Customer landing header links to `Paket & Pembayaran`.

## Required configuration before any live payment

1. In Supabase Dashboard → Project Settings → Edge Functions → Secrets, set:
   - `MIDTRANS_SERVER_KEY` = the server key from the matching Midtrans environment.
   - `MIDTRANS_IS_PRODUCTION` = `false` while testing sandbox; set `true` only after sandbox tests and Midtrans production approval.
2. Ensure the built-in Supabase Edge Function environment values `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to Edge Functions (Supabase supplies these in its hosted environment).
3. In Midtrans Dashboard → Settings / Configuration → Payment Notification URL, set:
   `https://evtkeyfjgqwarsmlzrkh.supabase.co/functions/v1/midtrans-notification`
4. Enable QRIS in the Midtrans payment-method configuration and confirm the merchant has been approved for the intended environment.
5. Ensure the JFS AI app has an authenticated user session. Checkout intentionally rejects anonymous orders.

## Important safety notes

- Never put `MIDTRANS_SERVER_KEY` or the Supabase service-role key in HTML, GitHub, screenshots, PDF, or customer-visible logs.
- Keep `MIDTRANS_IS_PRODUCTION=false` until a sandbox transaction has been tested end-to-end.
- The payment-result redirect is informational only. Subscription activation depends on the server-side status lookup, not on the browser redirect.
- Do not present a sandbox payment as a real payment or use fabricated payment evidence in the Midtrans onboarding PDF.

## Verification checklist

- [ ] Configure sandbox server key as an Edge Function secret.
- [ ] Confirm the plan's active price and duration in Subscription Control.
- [ ] Log in with a test user and open `checkout.html`.
- [ ] Select a paid product/package and confirm an order is recorded.
- [ ] Complete a sandbox QRIS payment using Midtrans's current test instructions.
- [ ] Confirm the webhook is delivered and order status becomes `PAID`.
- [ ] Confirm exactly one active `jfs_app_subscriptions` row is created for the order.
- [ ] Verify an unpaid, expired, or cancelled order does not activate a subscription.
- [ ] Capture screenshots from the deployed browser session showing product selection, package selection, Midtrans payment screen, and the verified result page.
- [ ] Only after all sandbox checks pass, request/confirm production activation with Midtrans.

## Known limitation at time of this commit

The server functions are deployed, but no Midtrans Server Key was provided or configured in this task session. Until the key and merchant QRIS approval are configured, the create-checkout function intentionally returns a configuration error and no real payment can be processed. Production checkout is therefore **not yet end-to-end verified**.
