-- JFS AI Core tenant isolation hardening
-- PREPARED ONLY. Do not execute directly in production without tests/review.

begin;

-- 1) Tenant bootstrap must never be callable by a client with an arbitrary user UUID.
-- The auth trigger remains SECURITY DEFINER and can invoke this function internally.
revoke execute on function public.ensure_tenant_for_user(uuid) from anon, authenticated;

-- 2) Trigger-only SECURITY DEFINER functions must not be exposed as RPC endpoints.
revoke execute on function public.handle_new_user_tenant() from anon, authenticated;
revoke execute on function public.jfs_amc_auto_progress_step() from anon, authenticated;

-- 3) Admin-only SECURITY DEFINER RPCs already enforce authorization internally,
-- but should not be exposed to unauthenticated callers.
revoke execute on function public.jfs_admin_can_manage_tenant(uuid) from anon;
revoke execute on function public.jfs_admin_complete_amc_participant(uuid) from anon;
revoke execute on function public.jfs_admin_set_amc_material_delivery(uuid,text,text) from anon;
revoke execute on function public.jfs_verify_amc_payment(uuid,text,text) from anon;

-- 4) Membership helpers are useful to authenticated applications, but do not need
-- anonymous execution because auth.uid()/JWT email are absent for anon callers.
revoke execute on function public.jfs_check_tenant_membership(uuid) from anon;
revoke execute on function public.jfs_get_my_tenant_membership(uuid) from anon;

-- 5) Public tenant profile currently exposes private contact fields (email, phone,
-- WhatsApp, address). Revoke the legacy RPC before replacing its consumers with a
-- deliberately public-safe profile RPC.
-- NOTE: keep this commented until all customer apps are migrated to the safe RPC.
-- revoke execute on function public.get_customer_tenant(text) from anon;

-- 6) RLS helper functions below must remain executable by authenticated because
-- PostgreSQL evaluates them inside RLS policies.
-- private.is_tenant_owner(uuid)
-- public.jfs_user_can_access_tenant(uuid)
-- public.jfs_user_can_manage_tenant(uuid)

commit;
