-- JFS AI Platform — Inventory & Stock foundation
-- Safe additive migration. Existing products/inventory data is preserved.
-- NOTE: inventory write policies and jfs_adjust_inventory() are defined in
-- 20260827_inventory_minimum_stock_atomic_write.sql so there is one source of truth.

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('stock_in','stock_out','adjustment')),
  quantity_change integer not null check (quantity_change <> 0),
  quantity_after integer not null check (quantity_after >= 0),
  note text,
  reference text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_tenant_product_created_idx
  on public.inventory_movements(tenant_id, product_id, created_at desc);
create index if not exists inventory_movements_tenant_created_idx
  on public.inventory_movements(tenant_id, created_at desc);

alter table public.inventory_movements enable row level security;

create or replace function public.jfs_is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.jfs_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.jfs_is_platform_admin() from public;
grant execute on function public.jfs_is_platform_admin() to authenticated;

create or replace function public.jfs_user_can_access_tenant(p_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.jfs_is_platform_admin()
  or exists (
    select 1 from public.tenant_users tu
    where tu.tenant_id = p_tenant_id
      and tu.user_id = auth.uid()
      and tu.is_active = true
  );
$$;
revoke all on function public.jfs_user_can_access_tenant(uuid) from public;
grant execute on function public.jfs_user_can_access_tenant(uuid) to authenticated;

create or replace function public.jfs_user_can_manage_tenant(p_tenant_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.jfs_is_platform_admin()
  or exists (
    select 1 from public.tenant_users tu
    where tu.tenant_id = p_tenant_id
      and tu.user_id = auth.uid()
      and tu.is_active = true
      and tu.role in ('owner','admin')
  );
$$;
revoke all on function public.jfs_user_can_manage_tenant(uuid) from public;
grant execute on function public.jfs_user_can_manage_tenant(uuid) to authenticated;

drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select
  on public.inventory_movements for select to authenticated
  using (public.jfs_user_can_access_tenant(tenant_id));

-- Inventory writes are intentionally handled by the atomic RPC in the
-- following migration, preventing direct quantity edits from bypassing the ledger.
drop policy if exists inventory_movements_insert on public.inventory_movements;

-- Tenant-scoped inventory reads. The atomic RPC is the single write path.
drop policy if exists inventory_select_tenant on public.inventory;
create policy inventory_select_tenant
  on public.inventory for select to authenticated
  using (public.jfs_user_can_access_tenant(tenant_id));

drop policy if exists "Public can read active product catalog" on public.products;
create policy products_public_active
  on public.products for select to anon
  using (is_active = true);

-- Authenticated product reads are tenant-scoped. Existing product management
-- policies remain untouched here.
drop policy if exists products_authenticated_select_tenant on public.products;
create policy products_authenticated_select_tenant
  on public.products for select to authenticated
  using (public.jfs_user_can_access_tenant(tenant_id));
