-- JFS AI Platform — Inventory & Stock
-- Safe additive migration. Existing products/inventory data is preserved.
-- This migration was applied to the connected JFS AI Supabase project before UI integration.

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
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.jfs_admins a where a.user_id = auth.uid()); $$;
revoke all on function public.jfs_is_platform_admin() from public;
grant execute on function public.jfs_is_platform_admin() to authenticated;

create or replace function public.jfs_user_can_access_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.jfs_is_platform_admin() or exists (select 1 from public.tenant_users tu where tu.tenant_id=p_tenant_id and tu.user_id=auth.uid() and tu.is_active=true); $$;
revoke all on function public.jfs_user_can_access_tenant(uuid) from public;
grant execute on function public.jfs_user_can_access_tenant(uuid) to authenticated;

create or replace function public.jfs_user_can_manage_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.jfs_is_platform_admin() or exists (select 1 from public.tenant_users tu where tu.tenant_id=p_tenant_id and tu.user_id=auth.uid() and tu.is_active=true and tu.role in ('owner','admin')); $$;
revoke all on function public.jfs_user_can_manage_tenant(uuid) from public;
grant execute on function public.jfs_user_can_manage_tenant(uuid) to authenticated;

drop policy if exists inventory_movements_select on public.inventory_movements;
drop policy if exists inventory_movements_insert on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements for select to authenticated using (public.jfs_user_can_access_tenant(tenant_id));
create policy inventory_movements_insert on public.inventory_movements for insert to authenticated with check (public.jfs_user_can_manage_tenant(tenant_id) and (created_by is null or created_by=auth.uid()));

drop policy if exists jfs_admins_manage_inventory on public.inventory;
drop policy if exists "tenant owners manage inventory" on public.inventory;
create policy inventory_select_tenant on public.inventory for select to authenticated using (public.jfs_user_can_access_tenant(tenant_id));
create policy inventory_insert_manage on public.inventory for insert to authenticated with check (public.jfs_user_can_manage_tenant(tenant_id));
create policy inventory_update_manage on public.inventory for update to authenticated using (public.jfs_user_can_manage_tenant(tenant_id)) with check (public.jfs_user_can_manage_tenant(tenant_id));
create policy inventory_delete_manage on public.inventory for delete to authenticated using (public.jfs_user_can_manage_tenant(tenant_id));

drop policy if exists "Public can read active product catalog" on public.products;
create policy products_public_active on public.products for select to anon using (is_active = true);
create policy products_authenticated_select_tenant on public.products for select to authenticated using (public.jfs_user_can_access_tenant(tenant_id));

create or replace function public.jfs_adjust_inventory(
  p_tenant_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_note text default null,
  p_reference text default null
)
returns public.inventory
language plpgsql security definer set search_path = public
as $$
declare
  v_inventory public.inventory%rowtype;
  v_delta integer;
  v_after integer;
begin
  if auth.uid() is null or not public.jfs_user_can_manage_tenant(p_tenant_id) then raise exception 'not authorized'; end if;
  if p_quantity is null or p_quantity=0 then raise exception 'quantity must not be zero'; end if;
  if p_movement_type not in ('stock_in','stock_out','adjustment') then raise exception 'invalid movement type'; end if;
  if p_movement_type in ('stock_in','stock_out') and p_quantity<0 then raise exception 'quantity must be positive'; end if;
  v_delta := case when p_movement_type='stock_out' then -abs(p_quantity) when p_movement_type='stock_in' then abs(p_quantity) else p_quantity end;
  select * into v_inventory from public.inventory where tenant_id=p_tenant_id and product_id=p_product_id for update;
  if not found then
    if v_delta<0 then raise exception 'inventory row not found'; end if;
    insert into public.inventory(tenant_id,product_id,quantity,stock_status) values(p_tenant_id,p_product_id,0,'Tersedia') returning * into v_inventory;
  end if;
  v_after=v_inventory.quantity+v_delta;
  if v_after<0 then raise exception 'stock tidak mencukupi'; end if;
  update public.inventory set quantity=v_after, stock_status=case when v_after=0 then 'Habis' when v_after<=5 then 'Menipis' else 'Tersedia' end, updated_at=now() where id=v_inventory.id returning * into v_inventory;
  insert into public.inventory_movements(tenant_id,product_id,movement_type,quantity_change,quantity_after,note,reference,created_by) values(p_tenant_id,p_product_id,p_movement_type,v_delta,v_after,p_note,p_reference,auth.uid());
  return v_inventory;
end;
$$;
revoke all on function public.jfs_adjust_inventory(uuid,uuid,text,integer,text,text) from public;
grant execute on function public.jfs_adjust_inventory(uuid,uuid,text,integer,text,text) to authenticated;
