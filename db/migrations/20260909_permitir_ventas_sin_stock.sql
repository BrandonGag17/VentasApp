-- Permite registrar productos sin stock sin modificar su inventario.
-- Ejecutar en el SQL Editor de Supabase luego de la migración FIFO.
create or replace function public.registrar_venta_fifo(p_id_cliente bigint, p_renglones jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_venta bigint;
  v_renglon jsonb;
  v_lote record;
  v_detalle bigint;
  v_pendiente integer;
  v_tomar integer;
  v_stock_actual integer;
  v_total numeric := 0;
begin
  if jsonb_typeof(p_renglones) <> 'array' or jsonb_array_length(p_renglones) = 0 then
    raise exception 'La venta debe incluir productos';
  end if;

  insert into public."Ventas" ("idCliente", fecha, estado, total)
  values (p_id_cliente, now(), 'activa', 0)
  returning "idVenta" into v_venta;

  for v_renglon in select * from jsonb_array_elements(p_renglones) loop
    v_pendiente := (v_renglon->>'cantidad')::integer;
    if v_pendiente <= 0 or (v_renglon->>'precioVenta')::numeric < 0 then
      raise exception 'Renglón de venta inválido';
    end if;

    select coalesce("Stock", 0)
    into v_stock_actual
    from public."Productos"
    where "idProducto" = (v_renglon->>'idProducto')::bigint
    for update;

    if not found then
      raise exception 'Producto inexistente';
    end if;

    insert into public."DetalleVentas" ("idVenta", "idProducto", "CantidadUnidades", "PrecioVentaUnitario")
    values (v_venta, (v_renglon->>'idProducto')::bigint, v_pendiente, (v_renglon->>'precioVenta')::numeric)
    returning "idDetalle" into v_detalle;

    -- Sin stock: la venta se registra, pero no se toca el inventario ni los lotes.
    if v_stock_actual > 0 then
      for v_lote in
        select * from public."LotesStock"
        where "idProducto" = (v_renglon->>'idProducto')::bigint
          and "CantidadDisponible" > 0
        order by "fechaIngreso", "idLote"
        for update
      loop
        exit when v_pendiente = 0;
        v_tomar := least(v_pendiente, v_lote."CantidadDisponible");
        update public."LotesStock"
        set "CantidadDisponible" = "CantidadDisponible" - v_tomar
        where "idLote" = v_lote."idLote";
        insert into public."ConsumosLote" ("idDetalle", "idLote", "Cantidad", "CostoUnitario")
        values (v_detalle, v_lote."idLote", v_tomar, v_lote."PrecioCompra");
        v_pendiente := v_pendiente - v_tomar;
      end loop;

      if v_pendiente > 0 then
        raise exception 'No hay stock suficiente para el producto %', v_renglon->>'idProducto';
      end if;

      update public."Productos"
      set "Stock" = coalesce("Stock", 0) - (v_renglon->>'cantidad')::integer
      where "idProducto" = (v_renglon->>'idProducto')::bigint;
    end if;

    v_total := v_total + (v_renglon->>'cantidad')::integer * (v_renglon->>'precioVenta')::numeric;
  end loop;

  update public."Ventas" set total = v_total where "idVenta" = v_venta;
  return v_venta;
end;
$$;

grant execute on function public.registrar_venta_fifo(bigint, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
