create table if not exists public.accesos_resultados (
 usuaria_id uuid primary key references auth.users(id) on delete cascade,
 habilitada boolean not null default false,
 administradora_id uuid references auth.users(id) on delete set null,
 actualizada_en timestamptz not null default now()
);
alter table public.accesos_resultados enable row level security;
revoke all on public.accesos_resultados from anon, authenticated;
grant select, insert, update on public.accesos_resultados to authenticated;
grant all on public.accesos_resultados to service_role;
drop policy if exists "Leer acceso propio a resultados" on public.accesos_resultados;
create policy "Leer acceso propio a resultados" on public.accesos_resultados for select to authenticated using (usuaria_id=(select auth.uid()) or (select public.es_admin()));
drop policy if exists "Flor gestiona acceso a resultados" on public.accesos_resultados;
create policy "Flor gestiona acceso a resultados" on public.accesos_resultados for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create or replace function public.puede_usar_resultados() returns boolean language sql stable security invoker set search_path='' as $$
 select (select public.es_admin()) or exists (
 select 1 from public.perfiles p join public.accesos_resultados a on a.usuaria_id=p.id
 where p.id=(select auth.uid()) and p.estado='activa' and a.habilitada
 and (p.tipo_usuario='socia' or p.rol in ('afiliada','afiliada_lanzamiento')));
$$;
revoke all on function public.puede_usar_resultados() from public,anon;
grant execute on function public.puede_usar_resultados() to authenticated,service_role;
drop policy if exists "Modulos Socias en preparacion" on public.resultados;
drop policy if exists "Resultados privados por acceso" on public.resultados;
create policy "Resultados privados por acceso" on public.resultados as restrictive for select to authenticated using ((select public.es_admin()) or (alumna_id=(select auth.uid()) and (select public.puede_usar_resultados())));
drop policy if exists "Resultados nuevos en revision" on public.resultados;
create policy "Resultados nuevos en revision" on public.resultados as restrictive for insert to authenticated with check (alumna_id=(select auth.uid()) and estado='pendiente' and (select public.puede_usar_resultados()));
drop policy if exists "Solo Flor revisa resultados" on public.resultados;
create policy "Solo Flor revisa resultados" on public.resultados as restrictive for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
drop policy if exists "Capturas resultados solo administracion" on storage.objects;
create policy "Capturas resultados solo administracion" on storage.objects as restrictive for all to anon,authenticated using (bucket_id<>'resultados' or (select public.es_admin())) with check (bucket_id<>'resultados' or (select public.es_admin()));

revoke all on public.resultados from anon;
create index if not exists accesos_resultados_administradora_idx on public.accesos_resultados(administradora_id);
