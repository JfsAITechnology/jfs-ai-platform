-- Close broad anonymous table reads after public customer-service RPCs are available.
-- Public storefront/catalog flows should use the scoped public RPCs; authenticated
-- tenant owners and JFS admins retain their existing table policies and grants.

REVOKE SELECT ON TABLE public.tenants, public.products, public.jfs_knowledge FROM anon;

DROP POLICY IF EXISTS "products_public_active" ON public.products;
DROP POLICY IF EXISTS "customer_public_active_knowledge" ON public.jfs_knowledge;

-- Preserve the existing active/trial tenant directory access for signed-in users
-- while removing the anonymous role from the policy.
DROP POLICY IF EXISTS "Public can read active trial tenant directory" ON public.tenants;
CREATE POLICY "Authenticated can read active trial tenant directory"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (status = ANY (ARRAY['active'::text, 'trial'::text]));
