-- Tenant-scoped, read-only public APIs for the standalone JFS AI WhatsApp CS.
-- These deliberately return only selected public profile/product fields and
-- customer-facing knowledge categories for one active/trial AI-enabled tenant.

CREATE OR REPLACE FUNCTION public.jfs_public_customer_service_tenant(p_tenant_code text)
RETURNS TABLE(
  id uuid,
  tenant_code text,
  business_name text,
  business_type text,
  address text,
  city text,
  province text,
  status text,
  ai_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT t.id, t.tenant_code, t.business_name, t.business_type,
         t.address, t.city, t.province, t.status, t.ai_enabled
  FROM public.tenants AS t
  WHERE p_tenant_code IS NOT NULL
    AND btrim(p_tenant_code) <> ''
    AND lower(t.tenant_code) = lower(btrim(p_tenant_code))
    AND t.status IN ('active', 'trial')
    AND t.ai_enabled IS TRUE
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.jfs_public_customer_service_products(p_tenant_code text)
RETURNS TABLE(
  id uuid,
  name text,
  price numeric,
  description text,
  category text,
  brand text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT p.id, p.name, p.price, p.description, p.category, p.brand
  FROM public.products AS p
  JOIN public.tenants AS t ON t.id = p.tenant_id
  WHERE p_tenant_code IS NOT NULL
    AND btrim(p_tenant_code) <> ''
    AND lower(t.tenant_code) = lower(btrim(p_tenant_code))
    AND t.status IN ('active', 'trial')
    AND t.ai_enabled IS TRUE
    AND p.is_active IS TRUE
  ORDER BY p.name;
$function$;

CREATE OR REPLACE FUNCTION public.jfs_public_customer_service_knowledge(p_tenant_code text)
RETURNS TABLE(
  id uuid,
  category text,
  title text,
  content text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT k.id, k.category, k.title, k.content
  FROM public.jfs_knowledge AS k
  JOIN public.tenants AS t ON t.id = k.tenant_id
  WHERE p_tenant_code IS NOT NULL
    AND btrim(p_tenant_code) <> ''
    AND lower(t.tenant_code) = lower(btrim(p_tenant_code))
    AND t.status IN ('active', 'trial')
    AND t.ai_enabled IS TRUE
    AND k.is_active IS TRUE
    AND lower(btrim(coalesce(k.category, ''))) = ANY (ARRAY[
      'faq', 'catalog', 'pricing', 'profile', 'business', 'general',
      'harga', 'jam operasional', 'antar-jemput', 'layanan', 'lokasi', 'pemesanan'
    ]::text[])
  ORDER BY k.category, k.title;
$function$;

REVOKE EXECUTE ON FUNCTION public.jfs_public_customer_service_tenant(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jfs_public_customer_service_products(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jfs_public_customer_service_knowledge(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jfs_public_customer_service_tenant(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jfs_public_customer_service_products(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jfs_public_customer_service_knowledge(text) TO anon, authenticated;
