create or replace function public.generar_link_afiliada(p_afiliada_id uuid, p_producto_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare codigo text; rol_afiliada text;
begin
  if (select auth.uid()) is null then raise exception 'Iniciá sesión para generar un link'; end if;
  if not (select public.es_admin()) then raise exception 'El módulo Productos todavía no está habilitado'; end if;
  select p.rol into rol_afiliada from public.perfiles p where p.id = p_afiliada_id;
  if rol_afiliada is null or rol_afiliada not in ('afiliada','afiliada_lanzamiento','admin') then raise exception 'El perfil no tiene acceso de afiliada'; end if;
  if not exists (select 1 from public.productos pr where pr.id = p_producto_id and pr.activo) then raise exception 'El producto no está disponible'; end if;
  codigo := substring(p_afiliada_id::text, 1, 8) || '-' || substring(p_producto_id::text, 1, 8);
  insert into public.links_afiliadas (afiliada_id, producto_id, codigo) values (p_afiliada_id, p_producto_id, codigo) on conflict (afiliada_id, producto_id) do nothing;
  return codigo;
end $$;
