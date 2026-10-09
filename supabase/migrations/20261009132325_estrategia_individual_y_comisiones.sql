-- Permiso independiente: habilitar clases no habilita Estrategia.
create table public.accesos_estrategia (
  usuaria_id uuid primary key references public.perfiles(id) on delete cascade,
  habilitada boolean not null default false,
  actualizada_en timestamptz not null default now(),
  administradora_id uuid references auth.users(id) on delete set null
);
alter table public.accesos_estrategia enable row level security;
revoke all on public.accesos_estrategia from anon, authenticated;
grant select on public.accesos_estrategia to authenticated;
grant all on public.accesos_estrategia to service_role;
create policy "Consultar acceso propio o administracion" on public.accesos_estrategia
  for select to authenticated using (usuaria_id = (select auth.uid()) or public.es_admin());

-- Se conservan las métricas y las políticas existentes; el bloqueo también
-- se aplica a lecturas/escrituras directas desde el navegador.
create policy "Estrategia requiere habilitacion individual" on public.metricas_lanzamiento
  as restrictive for all to authenticated
  using (public.es_admin() or exists (
    select 1 from public.accesos_estrategia a
    where a.usuaria_id = (select auth.uid()) and a.habilitada
  ))
  with check (public.es_admin() or exists (
    select 1 from public.accesos_estrategia a
    where a.usuaria_id = (select auth.uid()) and a.habilitada
  ));

-- Sin precio/comisión inventados para datos históricos.
alter table public.metricas_lanzamiento
  add column precio_producto numeric,
  add column comision_porcentaje numeric,
  add constraint precio_producto_valido check (precio_producto > 0 and precio_producto < 1000000000),
  add constraint comision_porcentaje_valida check (comision_porcentaje > 0 and comision_porcentaje <= 100);
