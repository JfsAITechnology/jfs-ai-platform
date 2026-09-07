-- JFS AI production security hardening applied 2026-09-07.
-- Keep this migration in source control as the canonical database change.

revoke execute on function public.ensure_tenant_for_user(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user_tenant() from public, anon, authenticated;
revoke execute on function public.jfs_amc_auto_progress_step() from public, anon, authenticated;

revoke execute on function public.jfs_admin_can_manage_tenant(uuid) from public, anon;
revoke execute on function public.jfs_admin_complete_amc_participant(uuid) from public, anon;
revoke execute on function public.jfs_admin_set_amc_material_delivery(uuid,text,text) from public, anon;
revoke execute on function public.jfs_verify_amc_payment(uuid,text,text) from public, anon;

revoke execute on function public.jfs_check_tenant_membership(uuid) from public, anon;
grant execute on function public.jfs_check_tenant_membership(uuid) to authenticated;
revoke execute on function public.jfs_get_my_tenant_membership(uuid) from public, anon;
grant execute on function public.jfs_get_my_tenant_membership(uuid) to authenticated;
