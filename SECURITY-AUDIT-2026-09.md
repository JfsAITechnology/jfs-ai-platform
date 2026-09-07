# JFS AI Security Audit — 2026-09

## Scope
- Supabase project `evtkeyfjgqwarsmlzrkh`
- Git branch `fix/core-tenant-isolation-2026-09`
- Core tenant isolation, RLS, SECURITY DEFINER functions, and client tenant selection.

## Findings

### Critical: tenant bootstrap function accepts arbitrary user ID
`public.ensure_tenant_for_user(p_user_id uuid)` is `SECURITY DEFINER` and executable by `authenticated`. The function operates on the supplied `p_user_id`, not only `auth.uid()`.

Risk: an authenticated client can invoke the function for another user ID and cause privileged tenant lookup/creation for that identity.

Planned fix: revoke direct client EXECUTE on the parameterized function. The trigger `handle_new_user_tenant()` remains able to invoke it as its SECURITY DEFINER owner.

### High: core UI enumerates tenants client-side
`core-services.js` loads `tenants` and `tenant_subscriptions` without first establishing a tenant context. RLS currently limits ordinary users unless they are platform admins, but the UI is designed around a freely selectable tenant list.

Required architecture: platform admin may enumerate tenants; ordinary tenant users must receive only their own authorized tenant(s). Client-side `tenantId` must never be treated as an authorization boundary.

### High: direct subscription mutation from client
`core-services.js` inserts `tenant_subscriptions` directly for activation. This bypasses the existing privileged RPC design used by the admin page (`renew_tenant_subscription`). Subscription activation should be performed through a server-side authorization check/RPC, not by trusting a client-selected tenant ID.

### Medium: public customer tenant RPC returns private contact fields
`public.get_customer_tenant()` is executable by `anon` and currently returns email, phone, WhatsApp, and address. This should be reduced to fields intentionally required by a public customer application.

### Medium: duplicate admin helper functions
The database contains overlapping helpers (`jfs_is_platform_admin`, `jfs_is_super_admin`, `is_jfs_super_admin`, etc.). This increases authorization drift risk. Consolidate to one canonical platform-admin predicate after compatibility is mapped.

## Current RLS status
RLS is enabled on the audited tenant tables. The main remaining risk is authorization design around SECURITY DEFINER functions and client-side tenant selection, not simply whether RLS is enabled.

## Production safety rule
No production DDL is executed by this audit. SQL changes are prepared in GitHub first and must pass review/tests before production migration.
