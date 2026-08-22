# JFS AI Core — Tenant & Subscription Rules

## Authority
- `jfs_admins` identifies Super Admin users.
- Only Super Admin may mutate tenant subscriptions.
- Tenant Admin/users may read their own subscription only.
- UI restrictions are not the security boundary; Supabase RLS/RPC is.

## Subscription states
- `active`: tenant service access allowed when `end_date >= current_date`.
- `pending`: waiting for activation/payment.
- `suspended`: manually deactivated by Super Admin.
- `expired`: period ended.
- `cancelled`: manually cancelled.

## Manual controls
Super Admin can activate, deactivate/suspend, and reactivate subscriptions. Every manual change is written to `subscription_history` with `created_by = auth.uid()`.

## Tenant behavior
Tenant Admin can view subscription status and period, but cannot activate, deactivate, reactivate, renew, or change plans.
