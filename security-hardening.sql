-- JFS AI Core tenant isolation hardening
-- PREPARED ONLY. Do not execute directly in production without tests/review.

begin;

-- Prevent authenticated clients from invoking tenant bootstrap for an arbitrary user.
-- The auth trigger remains SECURITY DEFINER and can still invoke this function.
revoke execute on function public.ensure_tenant_for_user(uuid) from anon, authenticated;

-- These helpers are intentionally callable by authenticated users because they are used
-- by RLS policy expressions. Do not revoke them unless policies are migrated first.
-- private.is_tenant_owner(uuid)
-- public.jfs_user_can_access_tenant(uuid)
-- public.jfs_user_can_manage_tenant(uuid)

commit;
