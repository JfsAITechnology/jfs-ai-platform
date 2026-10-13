-- Fix mutable search_path warnings on timestamp trigger functions.
-- The bodies only use NEW and built-in now(), so pg_catalog is sufficient.
ALTER FUNCTION public.set_video_updated_at() SET search_path TO 'pg_catalog';
ALTER FUNCTION public.set_portfolio_updated_at() SET search_path TO 'pg_catalog';
