CREATE OR REPLACE FUNCTION public.jfs_admin_update_app_plan(
  p_id text,
  p_price numeric,
  p_name text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_is_active boolean DEFAULT true
)
RETURNS public.jfs_app_subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v public.jfs_app_subscription_plans%rowtype;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.jfs_admins a WHERE a.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'PLAN_PRICE_INVALID';
  END IF;

  SELECT * INTO v
  FROM public.jfs_app_subscription_plans
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;

  -- Prevent a normal WhatsApp CS paid package from being accidentally enabled at Rp0.
  IF v.app_code = 'WHATSAPP-CS'
     AND p_is_active IS TRUE
     AND v.is_trial IS FALSE
     AND upper(v.id) NOT LIKE '%CUSTOM%'
     AND p_price <= 0 THEN
    RAISE EXCEPTION 'PAID_PLAN_PRICE_MUST_BE_POSITIVE';
  END IF;

  UPDATE public.jfs_app_subscription_plans
  SET price = p_price,
      name = coalesce(nullif(trim(p_name), ''), name),
      description = coalesce(p_description, description),
      is_active = p_is_active,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v;

  RETURN v;
END;
$function$;
