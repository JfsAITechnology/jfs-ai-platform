-- Owner APIs must run with the caller's privileges so table RLS remains a
-- second line of defense in addition to the explicit tenant-manager predicate.
ALTER FUNCTION public.jfs_owner_customer_service_tenant(text) SECURITY INVOKER;
ALTER FUNCTION public.jfs_owner_customer_service_products(text) SECURITY INVOKER;
ALTER FUNCTION public.jfs_owner_customer_service_knowledge(text) SECURITY INVOKER;
