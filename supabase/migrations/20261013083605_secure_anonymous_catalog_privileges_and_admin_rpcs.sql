-- Security hardening applied 2026-10-13.
-- Preserve public catalog reads through RLS, but remove anonymous DDL/DML-like
-- privileges and prohibit anonymous writes to demo products.

REVOKE ALL PRIVILEGES ON TABLE public.tenants, public.products, public.jfs_knowledge FROM anon;
GRANT SELECT ON TABLE public.tenants, public.products, public.jfs_knowledge TO anon;

DROP POLICY IF EXISTS "demo products anon insert" ON public.products;
DROP POLICY IF EXISTS "demo products anon update" ON public.products;
DROP POLICY IF EXISTS "demo products anon delete" ON public.products;

REVOKE EXECUTE ON FUNCTION public.jfs_admin_activate_custom_app_subscription(uuid, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jfs_admin_activate_custom_app_subscription(uuid, integer, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.jfs_reset_demo_tenant(p_tenant_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.jfs_admins a WHERE a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;

  IF p_tenant_code IS DISTINCT FROM 'JFS-LAUNDRY-DEMO-001' THEN
    RAISE EXCEPTION 'Demo tenant only';
  END IF;

  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE tenant_code = p_tenant_code;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Demo tenant not found';
  END IF;

  DELETE FROM public.jfs_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM public.products WHERE tenant_id = v_tenant_id;
  DELETE FROM public.jfs_laundry_subscription_requests WHERE tenant_id = v_tenant_id;

  UPDATE public.tenants
  SET business_name = '',
      whatsapp = NULL,
      phone = NULL,
      address = NULL,
      city = NULL,
      province = NULL,
      status = 'active',
      updated_at = now()
  WHERE id = v_tenant_id;

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.jfs_reset_demo_tenant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jfs_reset_demo_tenant(text) TO authenticated;
