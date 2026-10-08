-- Endurece accesos a contenido y links sin cambiar datos existentes.
-- La app ya exige sesión y plan 27/97 para el aula; RLS replica ese control.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.rol = 'admin'
  );
$$;

-- Se conserva el acceso de ejecución porque varias políticas existentes consultan
-- esta función incluso para lecturas públicas; solo devuelve el rol del usuario actual.
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to anon, authenticated, service_role;

-- Los productos activos son catálogo público; los inactivos quedan solo para admin.
alter table public.productos enable row level security;
drop policy if exists "Admin ve todos los productos" on public.productos;
drop policy if exists "Ver productos activos" on public.productos;
create policy "Ver productos activos"
on public.productos
for select
to anon, authenticated
using (activo = true or (select public.es_admin()));

-- Las clases solo se entregan a usuarias autenticadas con el plan correspondiente.
alter table public.clases enable row level security;
drop policy if exists "Ver clases activas" on public.clases;
drop policy if exists "Admin gestiona clases" on public.clases;
create policy "Ver clases del plan"
on public.clases
for select
to authenticated
using (
  activo = true
  and exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and (
        p.rol = 'admin'
        or (p.plan = '27' and clases.plan = '27')
        or (p.plan = '97' and clases.plan in ('27', '97'))
      )
  )
);
create policy "Admin gestiona clases"
on public.clases
for all
to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

-- La biblioteca publicada requiere cuenta y plan de alumna; admin conserva gestión.
alter table public.modulos enable row level security;
drop policy if exists "Ver modulos publicados" on public.modulos;
drop policy if exists "Admin gestiona modulos" on public.modulos;
create policy "Ver modulos del programa"
on public.modulos
for select
to authenticated
using (
  (estado = 'publicado' and exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.plan in ('27', '97')
  ))
  or (select public.es_admin())
);
create policy "Admin gestiona modulos"
on public.modulos
for all
to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

alter table public.lecciones enable row level security;
drop policy if exists "Ver lecciones" on public.lecciones;
drop policy if exists "Admin gestiona lecciones" on public.lecciones;
create policy "Ver lecciones del programa"
on public.lecciones
for select
to authenticated
using (
  exists (
    select 1
    from public.modulos m
    where m.id = lecciones.modulo_id
      and m.estado = 'publicado'
      and exists (
        select 1
        from public.perfiles p
        where p.id = (select auth.uid())
          and p.plan in ('27', '97')
      )
  )
  or (select public.es_admin())
);
create policy "Admin gestiona lecciones"
on public.lecciones
for all
to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

-- Las funciones de trigger no son endpoints RPC y no deben invocarse desde clientes.
alter function public.crear_perfil_nuevo_usuario() set search_path = '';
alter function public.handle_new_user() set search_path = '';
revoke all on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Solo una afiliada puede generar su propio link; admin puede ayudar a cualquier afiliada.
create or replace function public.generar_link_afiliada(p_afiliada_id uuid, p_producto_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  codigo text;
  rol_afiliada text;
begin
  if (select auth.uid()) is null then
    raise exception 'Iniciá sesión para generar un link';
  end if;

  if p_afiliada_id is distinct from (select auth.uid())
     and not (select public.es_admin()) then
    raise exception 'No tenés permiso para generar un link para otra persona';
  end if;

  select p.rol into rol_afiliada
  from public.perfiles p
  where p.id = p_afiliada_id;

  if rol_afiliada is null or rol_afiliada not in ('afiliada', 'afiliada_lanzamiento', 'admin') then
    raise exception 'El perfil no tiene acceso de afiliada';
  end if;

  if not exists (
    select 1 from public.productos pr
    where pr.id = p_producto_id and pr.activo = true
  ) then
    raise exception 'El producto no está disponible';
  end if;

  codigo := substring(p_afiliada_id::text, 1, 8) || '-' || substring(p_producto_id::text, 1, 8);
  insert into public.links_afiliadas (afiliada_id, producto_id, codigo)
  values (p_afiliada_id, p_producto_id, codigo)
  on conflict (afiliada_id, producto_id) do nothing;
  return codigo;
end;
$$;

revoke all on function public.generar_link_afiliada(uuid, uuid) from public, anon;
grant execute on function public.generar_link_afiliada(uuid, uuid) to authenticated, service_role;
