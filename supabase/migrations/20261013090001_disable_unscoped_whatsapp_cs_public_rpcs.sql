-- The WhatsApp CS dashboard has been migrated to owner-only invoker RPCs.
-- Keep these early prototype endpoints inaccessible: they expose catalog/profile
-- rows by tenant code without owner membership checks and are not used by the app.
REVOKE EXECUTE ON FUNCTION public.jfs_public_customer_service_tenant(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jfs_public_customer_service_products(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jfs_public_customer_service_knowledge(text) FROM PUBLIC, anon, authenticated;
