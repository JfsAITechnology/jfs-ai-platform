-- JFS AI tenant isolation smoke tests
-- Run only against a disposable/dev database or inside a transaction.
-- Production data must never be modified by this file.

-- Test target: a NON-admin authenticated user who is an active member of TENANT_A.
-- The current production dataset has only platform-admin users in tenant_users,
-- so a true cross-tenant member test cannot yet be executed without a dedicated
-- test account. This script becomes executable once TEST_USER_A exists.

begin;

-- Replace TEST_USER_A and TENANT_A/TENANT_B in the test environment.
select set_config('request.jwt.claim.sub','TEST_USER_A',true);
select set_config('request.jwt.claim.role','authenticated',true);

-- Expected:
-- 1. jfs_user_can_access_tenant(TENANT_A) = true
-- 2. jfs_user_can_access_tenant(TENANT_B) = false
-- 3. jfs_user_can_manage_tenant(TENANT_A) = true only for owner/admin
-- 4. jfs_user_can_manage_tenant(TENANT_B) = false

-- Example policy probes:
-- select public.jfs_user_can_access_tenant('TENANT_A'::uuid) as own_access;
-- select public.jfs_user_can_access_tenant('TENANT_B'::uuid) as foreign_access;
-- select count(*) from public.products where tenant_id='TENANT_A'::uuid;
-- select count(*) from public.products where tenant_id='TENANT_B'::uuid;

rollback;
