alter table public.checklist_tareas
 add column categoria text not null default 'vida_personal',
 add column archivada boolean not null default false,
 add column version integer not null default 1,
 add column actualizada_en timestamptz not null default now();
alter table public.checklist_tareas alter column alumna_id set not null;
alter table public.checklist_tareas alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.checklist_tareas add constraint checklist_tarea_valida check (
 length(btrim(texto)) between 1 and 300 and categoria in ('pagos','negocio_digital','habitos','trabajo','vida_personal') and version>0
);
create index checklist_alumna_fecha_idx on public.checklist_tareas(alumna_id,fecha);
create or replace function public.actualizar_version_tarea() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.id<>old.id or new.alumna_id<>old.alumna_id or new.creado_en is distinct from old.creado_en then raise exception 'La identidad de la tarea no puede cambiar'; end if;
 new.version:=old.version+1; new.actualizada_en:=now(); return new;
end $$;
revoke all on function public.actualizar_version_tarea() from public,anon,authenticated;
create trigger checklist_version before update on public.checklist_tareas for each row execute function public.actualizar_version_tarea();
create table public.accesos_mi_dia (
 usuaria_id uuid primary key references auth.users(id) on delete cascade,
 habilitada boolean not null default false,
 administradora_id uuid references auth.users(id) on delete set null,
 actualizada_en timestamptz not null default now()
);
alter table public.accesos_mi_dia enable row level security;
revoke all on public.accesos_mi_dia from anon,authenticated;
grant select,insert,update on public.accesos_mi_dia to authenticated;
grant all on public.accesos_mi_dia to service_role;
create index accesos_mi_dia_administradora_idx on public.accesos_mi_dia(administradora_id);
create policy "Leer acceso propio a mi dia" on public.accesos_mi_dia for select to authenticated using (usuaria_id=(select auth.uid()) or (select public.es_admin()));
create policy "Flor habilita mi dia" on public.accesos_mi_dia for insert to authenticated with check ((select public.es_admin()));
create policy "Flor cambia acceso a mi dia" on public.accesos_mi_dia for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create or replace function public.puede_usar_mi_dia() returns boolean language sql stable security invoker set search_path='' as $$
 select (select public.es_admin()) or exists(
  select 1 from public.perfiles p join public.accesos_mi_dia a on a.usuaria_id=p.id
  where p.id=(select auth.uid()) and p.estado='activa' and a.habilitada and (p.tipo_usuario='socia' or p.rol in ('afiliada','afiliada_lanzamiento'))
 );
$$;
revoke all on function public.puede_usar_mi_dia() from public,anon;
grant execute on function public.puede_usar_mi_dia() to authenticated,service_role;
alter table public.checklist_tareas enable row level security;
revoke all on public.checklist_tareas from anon,authenticated;
grant select,insert,update on public.checklist_tareas to authenticated;
grant all on public.checklist_tareas to service_role;
drop policy if exists "Gestionar mis tareas" on public.checklist_tareas;
drop policy if exists "Ver mis tareas" on public.checklist_tareas;
drop policy if exists "Modulos Socias en preparacion" on public.checklist_tareas;
create policy "Tareas propias o administracion" on public.checklist_tareas for select to authenticated using ((select public.es_admin()) or (alumna_id=(select auth.uid()) and (select public.puede_usar_mi_dia())));
create policy "Crear tareas propias" on public.checklist_tareas for insert to authenticated with check (alumna_id=(select auth.uid()) and (select public.puede_usar_mi_dia()) and not completada and not archivada and version=1);
create policy "Editar tareas propias" on public.checklist_tareas for update to authenticated using (alumna_id=(select auth.uid()) and (select public.puede_usar_mi_dia())) with check (alumna_id=(select auth.uid()) and (select public.puede_usar_mi_dia()));
create or replace function public.resumen_mi_dia(desde date,hasta date)
 returns table(alumna_id uuid,fecha date,total bigint,completadas bigint,generales bigint,generales_completadas bigint,negocio bigint,negocio_completadas bigint)
 language plpgsql stable security invoker set search_path='' as $$
begin
 if desde is null or hasta is null or hasta<desde or hasta-desde>31 then raise exception 'El rango de fechas no es valido'; end if;
 return query select t.alumna_id,t.fecha,count(*),count(*) filter(where t.completada),
  count(*) filter(where t.categoria<>'negocio_digital'),count(*) filter(where t.categoria<>'negocio_digital' and t.completada),
  count(*) filter(where t.categoria='negocio_digital'),count(*) filter(where t.categoria='negocio_digital' and t.completada)
 from public.checklist_tareas t where t.fecha between desde and hasta and not t.archivada
 group by t.alumna_id,t.fecha;
end $$;
revoke all on function public.resumen_mi_dia(date,date) from public,anon;
grant execute on function public.resumen_mi_dia(date,date) to authenticated,service_role;

