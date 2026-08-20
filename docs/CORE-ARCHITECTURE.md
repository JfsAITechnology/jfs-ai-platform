# JFS AI Core Architecture

## Phase 2 contract

The Core Platform uses Supabase as the canonical source of truth.

### Canonical domains

- `tenants`: tenant identity and business profile.
- `tenant_subscriptions`: subscription history and access period.
- `subscription_plans`: available plans (3, 6 and 12 months).
- `jfs_admins`: administrative authorization.

### Tenant data rule

`tenant-data.js` is a browser bridge/cache only. It must never create or seed production tenants. The only supported production refresh is `get_platform_tenants` from Supabase.

`localStorage` may retain the last successful tenant snapshot so a temporary network error does not erase the current UI, but cached data must never be treated as authoritative for writes.

### Subscription rule

Subscription history is append-only for activation/renewal. Existing subscription records should not be overwritten to represent a new paid period. The admin subscription workflow uses the database RPC `renew_tenant_subscription` for renewal so the database remains responsible for period calculation and validation.

### UI rule

All tenant-aware modules must obtain the current tenant from the canonical tenant selector/state and must not maintain their own competing tenant list in localStorage.

### Phase 2 migration target

1. Tenant identity is canonical.
2. Subscription state is derived from `tenant_subscriptions`.
3. Admin authorization is checked before administrative writes.
4. Modules consume shared tenant state rather than hard-coded/bootstrap tenant data.
5. Marketplace, CRM, AI, automation and future modules will reuse the same tenant identity instead of creating separate tenant systems.

## Compatibility

Legacy tenant-specific scripts remain in place until each dependency is migrated and tested. Phase 2 deliberately avoids deleting legacy code that may still be required by existing tenant demos.