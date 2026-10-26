-- Comunidad voluntaria. Sin resultados, comprobantes ni perfiles privados.
-- Revisión previa del 26/10: las cinco tablas sociales estaban vacías.
-- No elimina filas ni cambia planes, usuarias, clases o comunicaciones.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- El permiso ALL legado permitía borrar/recrear el perfil propio y eludir el
-- guard de UPDATE. El alta real usa el trigger de Auth, no un INSERT del cliente.
drop policy if exists "Acceso propio perfil" on public.perfiles;
create policy "Consultar propio perfil" on public.perfiles for select to authenticated
using (id = (select auth.uid()));
revoke insert,delete,truncate,trigger,references on public.perfiles from anon,authenticated;

alter table public.publicaciones
  add column tipo text not null default 'avance',
  add column version integer not null default 1,
  add column actualizado_at timestamptz not null default now(),
  add column retirada_en timestamptz,
  add column oculta_en timestamptz,
  add column moderada_por uuid references auth.users(id),
  add column motivo_moderacion text;
alter table public.comentarios
  add column version integer not null default 1,
  add column actualizado_at timestamptz not null default now(),
  add column retirada_en timestamptz,
  add column oculta_en timestamptz,
  add column moderada_por uuid references auth.users(id),
  add column motivo_moderacion text;
alter table public.publicaciones alter column alumna_id set not null, alter column contenido set not null, alter column created_at set not null;
alter table public.comentarios alter column autor_id set not null, alter column publicacion_id set not null, alter column created_at set not null;
alter table public.reacciones alter column alumna_id set not null, alter column publicacion_id set not null,
  alter column tipo set default 'felicitar', alter column tipo set not null;
alter table public.publicaciones
  add constraint comunidad_publicacion_tipo check (tipo in ('avance','pregunta','idea')),
  add constraint comunidad_publicacion_texto check (char_length(btrim(contenido)) between 1 and 2000),
  add constraint comunidad_publicacion_version check (version between 1 and 1000000000),
  add constraint comunidad_publicacion_sin_imagen check (imagen_url is null),
  add constraint comunidad_publicacion_motivo check (motivo_moderacion is null or char_length(btrim(motivo_moderacion)) between 5 and 300);
alter table public.comentarios
  add constraint comunidad_comentario_texto check (char_length(btrim(contenido)) between 1 and 1000),
  add constraint comunidad_comentario_version check (version between 1 and 1000000000),
  add constraint comunidad_comentario_motivo check (motivo_moderacion is null or char_length(btrim(motivo_moderacion)) between 5 and 300);
alter table public.reacciones
  add constraint comunidad_reaccion_tipo check (tipo='felicitar'),
  add constraint comunidad_una_felicitacion unique(publicacion_id,alumna_id);

create index comunidad_feed_orden on public.publicaciones(created_at desc,id desc);
create index comunidad_autora_orden on public.publicaciones(alumna_id,created_at desc,id desc);
create index comunidad_comentarios_orden on public.comentarios(publicacion_id,created_at,id);
create index comunidad_comentarios_autora on public.comentarios(autor_id,created_at);
create index comunidad_reacciones_autora on public.reacciones(alumna_id);

create function private.puede_usar_comunidad() returns boolean
language sql stable security invoker set search_path='' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.perfiles p where p.id=(select auth.uid()) and (
      p.rol='admin' or (p.estado='activa' and case
        when p.tipo_usuario in ('gratuito','desafio','socia') then p.tipo_usuario='socia'
        else p.rol in ('afiliada','afiliada_lanzamiento') end)
    )
  );
$$;
revoke all on function private.puede_usar_comunidad() from public,anon;
grant execute on function private.puede_usar_comunidad() to authenticated;

create function private.comunidad_prueba_visible(autora uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select autora <> '06bb7999-997b-49c8-ba80-b8d05bca4a84'::uuid
     or autora=(select auth.uid()) or (select public.es_admin());
$$;
revoke all on function private.comunidad_prueba_visible(uuid) from public,anon;
grant execute on function private.comunidad_prueba_visible(uuid) to authenticated;

-- Reemplazo acotado de políticas auditadas. RLS permanece habilitada.
drop policy "Modulos Socias en preparacion" on public.publicaciones;
drop policy "Crear publicacion" on public.publicaciones;
drop policy "Ver publicaciones" on public.publicaciones;
drop policy "Admin elimina publicacion" on public.publicaciones;
drop policy "Modulos Socias en preparacion" on public.comentarios;
drop policy "Crear comentario" on public.comentarios;
drop policy "Ver comentarios" on public.comentarios;
drop policy "Modulos Socias en preparacion" on public.reacciones;
drop policy "Gestionar reaccion" on public.reacciones;
drop policy "Ver reacciones" on public.reacciones;
revoke all on public.publicaciones,public.comentarios,public.reacciones from public,anon,authenticated;
grant select,insert,update on public.publicaciones,public.comentarios to authenticated;
grant select,insert,delete on public.reacciones to authenticated;

create policy comunidad_publicaciones_lectura on public.publicaciones for select to authenticated using (
  (select private.puede_usar_comunidad()) and private.comunidad_prueba_visible(alumna_id)
  and ((retirada_en is null and oculta_en is null) or alumna_id=(select auth.uid()) or (select public.es_admin()))
);
create policy comunidad_publicaciones_alta on public.publicaciones for insert to authenticated
with check ((select private.puede_usar_comunidad()) and alumna_id=(select auth.uid()));
create policy comunidad_publicaciones_cambio on public.publicaciones for update to authenticated
using ((select private.puede_usar_comunidad()) and (alumna_id=(select auth.uid()) or (select public.es_admin())))
with check ((select private.puede_usar_comunidad()) and (alumna_id=(select auth.uid()) or (select public.es_admin())));

create policy comunidad_comentarios_lectura on public.comentarios for select to authenticated using (
  (select private.puede_usar_comunidad()) and private.comunidad_prueba_visible(autor_id)
  and exists(select 1 from public.publicaciones p where p.id=publicacion_id)
  and ((retirada_en is null and oculta_en is null) or autor_id=(select auth.uid()) or (select public.es_admin()))
);
create policy comunidad_comentarios_alta on public.comentarios for insert to authenticated with check (
  (select private.puede_usar_comunidad()) and autor_id=(select auth.uid())
  and exists(select 1 from public.publicaciones p where p.id=publicacion_id and p.retirada_en is null and p.oculta_en is null)
);
create policy comunidad_comentarios_cambio on public.comentarios for update to authenticated
using ((select private.puede_usar_comunidad()) and (autor_id=(select auth.uid()) or (select public.es_admin())))
with check ((select private.puede_usar_comunidad()) and (autor_id=(select auth.uid()) or (select public.es_admin())));

create policy comunidad_reacciones_lectura on public.reacciones for select to authenticated using (
  (select private.puede_usar_comunidad()) and private.comunidad_prueba_visible(alumna_id)
  and exists(select 1 from public.publicaciones p where p.id=publicacion_id
    and ((p.retirada_en is null and p.oculta_en is null) or p.alumna_id=(select auth.uid()) or (select public.es_admin())))
);
create policy comunidad_reacciones_alta on public.reacciones for insert to authenticated with check (
  (select private.puede_usar_comunidad()) and alumna_id=(select auth.uid())
  and exists(select 1 from public.publicaciones p where p.id=publicacion_id and p.retirada_en is null and p.oculta_en is null)
);
create policy comunidad_reacciones_retiro on public.reacciones for delete to authenticated
using ((select private.puede_usar_comunidad()) and alumna_id=(select auth.uid()));

-- Las consultas antiguas quedan operativas solo para Flor; no se abren como
-- una segunda comunidad ni permiten que una alumna marque una respuesta oficial.
create policy comunidad_consultas_anteriores_admin on public.preguntas as restrictive for all to anon,authenticated
using ((select public.es_admin())) with check ((select public.es_admin()));
create policy comunidad_respuestas_anteriores_admin on public.respuestas as restrictive for all to anon,authenticated
using ((select public.es_admin())) with check ((select public.es_admin()));
revoke all on public.preguntas,public.respuestas from public,anon;
revoke truncate,trigger,references,delete on public.preguntas,public.respuestas from authenticated;

create function private.proteger_texto_comunidad() returns trigger
language plpgsql security invoker set search_path='' as $$
declare
  uid uuid := (select auth.uid());
  administradora boolean := (select public.es_admin());
  autora uuid;
  limite integer;
  cantidad integer;
  moderacion boolean;
begin
  if uid is null or not (select private.puede_usar_comunidad()) then
    raise exception using errcode='42501',message='No tenés acceso a Comunidad.';
  end if;
  if tg_table_name='publicaciones' then autora:=new.alumna_id;
  else autora:=new.autor_id; end if;
  limite := case when tg_table_name='publicaciones' then 2000 else 1000 end;
  if char_length(btrim(new.contenido)) not between 1 and limite or new.contenido !~ '[^[:space:]]' then
    raise exception using errcode='22023',message='Revisá el largo del mensaje.';
  end if;
  if tg_op='INSERT' then
    if autora is distinct from uid or new.retirada_en is not null or new.oculta_en is not null
       or new.moderada_por is not null or new.motivo_moderacion is not null or new.version<>1 then
      raise exception using errcode='42501',message='La publicación debe pertenecer a tu cuenta.';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comunidad:' || uid::text,0));
    if tg_table_name='publicaciones' then
      select count(*) into cantidad from public.publicaciones where alumna_id=uid and created_at>now()-interval '24 hours';
      if cantidad>=20 then raise exception using errcode='P0001',message='community_rate_limit'; end if;
    else
      select count(*) into cantidad from public.comentarios where autor_id=uid and created_at>now()-interval '24 hours';
      if cantidad>=100 then raise exception using errcode='P0001',message='community_rate_limit'; end if;
      if not exists(select 1 from public.publicaciones p where p.id=new.publicacion_id and p.retirada_en is null and p.oculta_en is null) then
        raise exception using errcode='42501',message='Esta conversación ya no está disponible.';
      end if;
    end if;
    new.created_at:=statement_timestamp();
    new.actualizado_at:=new.created_at;
    return new;
  end if;
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at
     or new.version is distinct from old.version then
    raise exception using errcode='42501',message='No se puede cambiar la identidad del mensaje.';
  end if;
  if tg_table_name='publicaciones' then
    if new.alumna_id is distinct from old.alumna_id or new.imagen_url is distinct from old.imagen_url then
      raise exception using errcode='42501',message='No se puede cambiar la autora del mensaje.';
    end if;
  else
    if new.autor_id is distinct from old.autor_id or new.publicacion_id is distinct from old.publicacion_id then
      raise exception using errcode='42501',message='No se puede mover un comentario.';
    end if;
  end if;
  moderacion := new.oculta_en is distinct from old.oculta_en
    or new.moderada_por is distinct from old.moderada_por or new.motivo_moderacion is distinct from old.motivo_moderacion;
  if moderacion and not administradora then
    raise exception using errcode='42501',message='Solo Flor y su equipo pueden moderar.';
  end if;
  if autora<>uid then
    if not administradora or not moderacion or new.contenido is distinct from old.contenido
       or new.retirada_en is distinct from old.retirada_en then
      raise exception using errcode='42501',message='Solo la autora puede editar o retirar su mensaje.';
    end if;
    if tg_table_name='publicaciones' then
      if new.tipo is distinct from old.tipo then
        raise exception using errcode='42501',message='Solo la autora puede cambiar el tipo de mensaje.';
      end if;
    end if;
  end if;
  if old.oculta_en is not null and new.contenido is distinct from old.contenido then
    raise exception using errcode='42501',message='No se puede editar un mensaje oculto por moderación.';
  end if;
  if old.retirada_en is not null and new.contenido is distinct from old.contenido then
    raise exception using errcode='42501',message='Restaurá tu mensaje antes de editarlo.';
  end if;
  if moderacion then
    new.moderada_por:=uid;
    if new.oculta_en is not null then
      if new.motivo_moderacion is null or char_length(btrim(new.motivo_moderacion)) not between 5 and 300 then
        raise exception using errcode='22023',message='Indicá el motivo de moderación.';
      end if;
      new.oculta_en:=statement_timestamp();
    end if;
  end if;
  if new.retirada_en is distinct from old.retirada_en and new.retirada_en is not null then new.retirada_en:=statement_timestamp(); end if;
  new.version:=old.version+1;
  new.actualizado_at:=statement_timestamp();
  return new;
end;
$$;
revoke all on function private.proteger_texto_comunidad() from public,anon,authenticated;
create trigger proteger_publicacion_comunidad before insert or update on public.publicaciones
for each row execute function private.proteger_texto_comunidad();
create trigger proteger_comentario_comunidad before insert or update on public.comentarios
for each row execute function private.proteger_texto_comunidad();

-- Esta es la única proyección privilegiada: nombres y distintivo del equipo
-- de autoras de mensajes que la persona ya puede ver. Nunca devuelve perfiles.
create function private.autores_comunidad(p_ids uuid[]) returns table(id uuid,nombre text,es_admin boolean)
language plpgsql stable security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); administradora boolean;
begin
  if uid is null or not (select private.puede_usar_comunidad()) then
    raise exception using errcode='42501',message='No tenés acceso a Comunidad.';
  end if;
  if p_ids is null or cardinality(p_ids)>20 then raise exception using errcode='22023',message='Consulta de autoras inválida.'; end if;
  administradora:=(select public.es_admin());
  return query select p.id,left(coalesce(nullif(btrim(p.nombre),''),'Socia'),200),p.rol='admin'
  from public.perfiles p where p.id=any(p_ids) and (
    exists(select 1 from public.publicaciones x where x.alumna_id=p.id
      and (administradora or x.alumna_id=uid or (x.retirada_en is null and x.oculta_en is null))
      and (x.alumna_id<>'06bb7999-997b-49c8-ba80-b8d05bca4a84'::uuid or x.alumna_id=uid or administradora))
    or exists(select 1 from public.comentarios c join public.publicaciones x on x.id=c.publicacion_id
      where c.autor_id=p.id
      and (administradora or x.alumna_id=uid or (x.retirada_en is null and x.oculta_en is null))
      and (administradora or c.autor_id=uid or (c.retirada_en is null and c.oculta_en is null))
      and (x.alumna_id<>'06bb7999-997b-49c8-ba80-b8d05bca4a84'::uuid or x.alumna_id=uid or administradora)
      and (c.autor_id<>'06bb7999-997b-49c8-ba80-b8d05bca4a84'::uuid or c.autor_id=uid or administradora))
  );
end;
$$;
revoke all on function private.autores_comunidad(uuid[]) from public,anon;
grant execute on function private.autores_comunidad(uuid[]) to authenticated;
create function public.obtener_autores_comunidad(p_ids uuid[]) returns table(id uuid,nombre text,es_admin boolean)
language sql stable security invoker set search_path='' as $$ select * from private.autores_comunidad(p_ids); $$;
revoke all on function public.obtener_autores_comunidad(uuid[]) from public,anon;
grant execute on function public.obtener_autores_comunidad(uuid[]) to authenticated;

-- Conteos completos dentro de Postgres: una llamada, sin sumar una lista
-- truncada de comentarios/reacciones ni consultar por separado cada tarjeta.
create function public.obtener_resumen_comunidad(p_ids uuid[])
returns table(publicacion_id uuid,total_comentarios bigint,total_felicitaciones bigint,felicitada boolean)
language plpgsql stable security invoker set search_path='' as $$
begin
  if not (select private.puede_usar_comunidad()) then raise exception using errcode='42501',message='No tenés acceso a Comunidad.'; end if;
  if p_ids is null or cardinality(p_ids)>20 then raise exception using errcode='22023',message='Consulta de publicaciones inválida.'; end if;
  return query select p.id,
    (select count(*) from public.comentarios c where c.publicacion_id=p.id and c.retirada_en is null and c.oculta_en is null
      and (c.autor_id<>'06bb7999-997b-49c8-ba80-b8d05bca4a84'::uuid or c.autor_id=(select auth.uid()))),
    (select count(*) from public.reacciones r where r.publicacion_id=p.id
      and (r.alumna_id<>'06bb7999-997b-49c8-ba80-b8d05bca4a84'::uuid or r.alumna_id=(select auth.uid()))),
    exists(select 1 from public.reacciones r where r.publicacion_id=p.id and r.alumna_id=(select auth.uid()))
  from public.publicaciones p where p.id=any(p_ids);
end;
$$;
revoke all on function public.obtener_resumen_comunidad(uuid[]) from public,anon;
grant execute on function public.obtener_resumen_comunidad(uuid[]) to authenticated;
