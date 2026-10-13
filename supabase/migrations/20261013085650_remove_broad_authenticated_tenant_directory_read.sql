-- Login alone is not sufficient to enumerate all active tenants.
-- Super-admin and own-tenant read policies remain in place.
DROP POLICY IF EXISTS "Authenticated can read active trial tenant directory" ON public.tenants;
