alter table public.metricas
 add column if not exists campana text not null default 'Mi estrategia',
 add column if not exists fecha date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
 add column if not exists inversion_por_dia numeric,
 add column if not exists dias_captacion integer,
 add column if not exists gasto_acumulado numeric,
 add column if not exists version integer not null default 1,
 add column if not exists actualizado_at timestamptz not null default now();
alter table public.metricas alter column alumna_id set not null;
alter table public.metricas add constraint metricas_valores_validos check (
 estrategia in ('lanzamiento','automatica') and length(btrim(campana)) between 1 and 100 and version>0
 and (comision_producto is null or (comision_producto between 0 and 1000000000 and comision_producto=round(comision_producto,2)))
 and (inversion is null or (inversion between 0 and 1000000000 and inversion=round(inversion,2)))
 and (inversion_por_dia is null or (inversion_por_dia between 0 and 1000000000 and inversion_por_dia=round(inversion_por_dia,2)))
 and (gasto_acumulado is null or (gasto_acumulado between 0 and 1000000000 and gasto_acumulado=round(gasto_acumulado,2)))
 and (dias_captacion is null or dias_captacion between 0 and 3650)
 and coalesce(mensajes_recibidos,0) between 0 and 1000000000
 and coalesce(personas_grupo,0) between 0 and 1000000000
 and coalesce(reservas,0) between 0 and 1000000000
 and coalesce(ventas,0) between 0 and 1000000000
);
create unique index metricas_campana_fecha_idx on public.metricas(alumna_id,estrategia,lower(btrim(campana)),fecha);
create index metricas_alumna_fecha_idx on public.metricas(alumna_id,fecha desc);
create or replace function public.actualizar_version_metrica() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.id<>old.id or new.alumna_id<>old.alumna_id then raise exception 'La identidad del analisis no puede cambiar'; end if;
 new.version:=old.version+1; new.actualizado_at:=now(); return new;
end $$;
revoke all on function public.actualizar_version_metrica() from public,anon,authenticated;
create trigger metricas_version before update on public.metricas for each row execute function public.actualizar_version_metrica();
create table public.accesos_metricas (
 usuaria_id uuid primary key references auth.users(id) on delete cascade,
 habilitada boolean not null default false,
 administradora_id uuid references auth.users(id) on delete set null,
 actualizada_en timestamptz not null default now()
);
alter table public.accesos_metricas enable row level security;
revoke all on public.accesos_metricas from anon,authenticated;
grant select,insert,update on public.accesos_metricas to authenticated;
grant all on public.accesos_metricas to service_role;
create index accesos_metricas_administradora_idx on public.accesos_metricas(administradora_id);
create policy "Leer acceso propio a metricas" on public.accesos_metricas for select to authenticated using (usuaria_id=(select auth.uid()) or (select public.es_admin()));
create policy "Flor habilita metricas" on public.accesos_metricas for insert to authenticated with check ((select public.es_admin()));
create policy "Flor cambia acceso a metricas" on public.accesos_metricas for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create or replace function public.puede_usar_metricas() returns boolean language sql stable security invoker set search_path='' as $$
 select (select public.es_admin()) or exists(
  select 1 from public.perfiles p join public.accesos_metricas a on a.usuaria_id=p.id
  where p.id=(select auth.uid()) and p.estado='activa' and a.habilitada and (p.tipo_usuario='socia' or p.rol in ('afiliada','afiliada_lanzamiento'))
 );
$$;
revoke all on function public.puede_usar_metricas() from public,anon;
grant execute on function public.puede_usar_metricas() to authenticated,service_role;
alter table public.metricas enable row level security;
revoke all on public.metricas from anon,authenticated;
grant select,insert,update on public.metricas to authenticated;
grant all on public.metricas to service_role;
drop policy if exists "Alumna ve sus métricas" on public.metricas;
drop policy if exists "Modulos Socias en preparacion" on public.metricas;
create policy "Metricas propias o administracion" on public.metricas for select to authenticated using ((select public.es_admin()) or (alumna_id=(select auth.uid()) and (select public.puede_usar_metricas())));
create policy "Cargar metricas propias" on public.metricas for insert to authenticated with check (alumna_id=(select auth.uid()) and (select public.puede_usar_metricas()));
create policy "Editar metricas propias" on public.metricas for update to authenticated using (alumna_id=(select auth.uid()) and (select public.puede_usar_metricas())) with check (alumna_id=(select auth.uid()) and (select public.puede_usar_metricas()));
