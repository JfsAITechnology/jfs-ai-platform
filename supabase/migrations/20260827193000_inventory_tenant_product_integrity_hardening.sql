-- JFS AI Platform — Inventory tenant/product integrity hardening
-- Prevent cross-tenant product references and duplicate inventory rows.

create unique index if not exists inventory_tenant_product_unique
  on public.inventory(tenant_id, product_id);

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
  v_product_tenant uuid;
  v_delta integer;
  v_after integer;
begin
  if auth.uid() is null or not public.jfs_user_can_manage_tenant(p_tenant_id) then
    raise exception 'not authorized';
  end if;

  if p_quantity is null or p_quantity = 0 then
    raise exception 'quantity must not be zero';
  end if;

  if p_movement_type not in ('stock_in','stock_out','adjustment') then
    raise exception 'invalid movement type';
  end if;

  if p_movement_type in ('stock_in','stock_out') and p_quantity < 0 then
    raise exception 'quantity must be positive';
  end if;

  select tenant_id into v_product_tenant
  from public.products
  where id = p_product_id;

  if v_product_tenant is null then
    raise exception 'product not found';
  end if;

  if v_product_tenant <> p_tenant_id then
    raise exception 'product does not belong to tenant';
  end if;

  v_delta := case
    when p_movement_type = 'stock_out' then -abs(p_quantity)
    when p_movement_type = 'stock_in' then abs(p_quantity)
    else p_quantity
  end;

  select * into v_inventory
  from public.inventory
  where tenant_id = p_tenant_id
    and product_id = p_product_id
  for update;

  if not found then
    if v_delta < 0 then
      raise exception 'inventory row not found';
    end if;

    insert into public.inventory(
      tenant_id, product_id, quantity, minimum_stock, stock_status
    ) values (
      p_tenant_id, p_product_id, 0, 5, 'Tersedia'
    ) returning * into v_inventory;
  end if;

  v_after := v_inventory.quantity + v_delta;

  if v_after < 0 then
    raise exception 'stock tidak mencukupi';
  end if;

  update public.inventory
  set quantity = v_after,
      stock_status = case
        when v_after = 0 then 'Habis'
        when v_after <= minimum_stock then 'Menipis'
        else 'Tersedia'
      end,
      updated_at = now()
  where id = v_inventory.id
  returning * into v_inventory;

  insert into public.inventory_movements(
    tenant_id, product_id, movement_type, quantity_change,
    quantity_after, note, reference, created_by
  ) values (
    p_tenant_id, p_product_id, p_movement_type, v_delta,
    v_after, p_note, p_reference, auth.uid()
  );

  return v_inventory;
end;
$$;

revoke all on function public.jfs_adjust_inventory(uuid,uuid,text,integer,text,text) from public;
grant execute on function public.jfs_adjust_inventory(uuid,uuid,text,integer,text,text) to authenticated;
