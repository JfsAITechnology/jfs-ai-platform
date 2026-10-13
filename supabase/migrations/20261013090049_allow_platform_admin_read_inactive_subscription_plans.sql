DROP POLICY IF EXISTS "jfs platform admins can read all app subscription plans"
  ON public.jfs_app_subscription_plans;

CREATE POLICY "jfs platform admins can read all app subscription plans"
  ON public.jfs_app_subscription_plans
  FOR SELECT
  TO authenticated
  USING (public.jfs_is_platform_admin());
