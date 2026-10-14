-- Biblioteca actual: independiente de progreso_lecciones, que pertenece al
-- esquema anterior. No se eliminan ni reinterpretan respuestas históricas.
create table public.progreso_clases (
  alumna_id uuid not null references public.perfiles(id) on delete cascade,
  clase_id uuid not null references public.clases(id) on delete cascade,
  video_revision text not null,
  posicion_seg integer not null default 0 check (posicion_seg between 0 and 172800),
  duracion_seg integer not null default 0 check (duracion_seg between 0 and 172800),
  completada boolean not null default false,
  completado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  primary key (alumna_id, clase_id),
  check (posicion_seg <= duracion_seg)
);
create index progreso_clases_clase_idx on public.progreso_clases(clase_id);
alter table public.progreso_clases enable row level security;
revoke all on public.progreso_clases from anon, authenticated;
grant select on public.progreso_clases to authenticated;
grant all on public.progreso_clases to service_role;
create policy "Leer progreso propio o administrar" on public.progreso_clases
  for select to authenticated
  using (alumna_id = (select auth.uid()) or (select public.es_admin()));

-- Solo el servidor autenticado puede escribir. INVOKER, no bypass RLS público.
-- Cada operación actualiza únicamente su campo: una pausa no borra completada.
create function public.guardar_progreso_clase(
  p_alumna uuid, p_clase uuid, p_action text,
  p_posicion integer default null, p_duracion integer default null,
  p_completada boolean default null
) returns setof public.progreso_clases
language plpgsql security invoker set search_path = '' as $$
declare revision text;
begin
  select md5(coalesce(c.video_key,c.vimeo_url,'')) into revision
  from public.clases c join public.perfiles p on p.id=p_alumna
  where c.id=p_clase and c.activo and p.rol <> 'admin'
    and (c.video_key is not null or c.vimeo_url is not null)
    and (c.acceso_gratuito or p.desafio_socias_habilitada or p.tipo_usuario='socia');
  if revision is null then raise exception 'Clase no disponible' using errcode='42501'; end if;
  if p_action='posicion' and p_posicion is not null and p_duracion between 1 and 172800 and p_posicion between 0 and p_duracion then
    return query insert into public.progreso_clases as pc
      (alumna_id,clase_id,video_revision,posicion_seg,duracion_seg)
      values(p_alumna,p_clase,revision,p_posicion,p_duracion)
      on conflict(alumna_id,clase_id) do update set
        posicion_seg=excluded.posicion_seg, duracion_seg=excluded.duracion_seg,
        completada=case when pc.video_revision=revision then pc.completada else false end,
        completado_en=case when pc.video_revision=revision then pc.completado_en else null end,
        video_revision=revision, actualizado_en=now()
      returning pc.*;
  elsif p_action='completada' and p_completada is not null then
    return query insert into public.progreso_clases as pc
      (alumna_id,clase_id,video_revision,completada,completado_en)
      values(p_alumna,p_clase,revision,p_completada,case when p_completada then now() else null end)
      on conflict(alumna_id,clase_id) do update set
        completada=excluded.completada, completado_en=excluded.completado_en,
        posicion_seg=case when pc.video_revision=revision then pc.posicion_seg else 0 end,
        duracion_seg=case when pc.video_revision=revision then pc.duracion_seg else 0 end,
        video_revision=revision, actualizado_en=now()
      returning pc.*;
  else raise exception 'Progreso inválido' using errcode='22023'; end if;
end;
$$;
revoke all on function public.guardar_progreso_clase(uuid,uuid,text,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.guardar_progreso_clase(uuid,uuid,text,integer,integer,boolean) to service_role;

-- Agregación sin límite de filas REST. No exponer nombres ni contactos.
create function public.estadisticas_progreso_clases(p_excluir uuid[] default '{}')
returns table(clase_id uuid,iniciadas bigint,completadas bigint)
language sql stable security invoker set search_path='' as $$
  select c.id,count(pc.alumna_id),count(pc.alumna_id) filter(where pc.completada)
  from public.clases c
  left join public.progreso_clases pc on pc.clase_id=c.id
    and pc.video_revision=md5(coalesce(c.video_key,c.vimeo_url,''))
    and not(pc.alumna_id=any(p_excluir))
    and exists(select 1 from public.perfiles p where p.id=pc.alumna_id and p.rol<>'admin')
  where c.activo
  group by c.id;
$$;
revoke all on function public.estadisticas_progreso_clases(uuid[]) from public,anon,authenticated;
grant execute on function public.estadisticas_progreso_clases(uuid[]) to service_role;
