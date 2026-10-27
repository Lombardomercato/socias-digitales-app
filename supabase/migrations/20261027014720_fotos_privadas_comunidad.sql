-- Fotos opcionales de Comunidad. No publica URLs ni transforma resultados privados.
-- Los bytes se guardan en R2 privado; la lectura deriva autora/post/foto y revalida RLS.
create function private.fotos_comunidad_validas(fotos jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare foto jsonb; ids text[] := array[]::text[];
begin
  if fotos is null or jsonb_typeof(fotos)<>'array' or jsonb_array_length(fotos)>4 then return false; end if;
  for foto in select value from jsonb_array_elements(fotos) loop
    if jsonb_typeof(foto)<>'object' or (select count(*) from jsonb_object_keys(foto))<>3
       or not (foto ?& array['id','ancho','alto'])
       or jsonb_typeof(foto->'id')<>'string'
       or (foto->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(foto->'ancho')<>'number' or jsonb_typeof(foto->'alto')<>'number'
       or (foto->>'ancho') !~ '^[1-9][0-9]{0,3}$' or (foto->>'alto') !~ '^[1-9][0-9]{0,3}$'
       or (foto->>'ancho')::integer>2048 or (foto->>'alto')::integer>2048
       or foto->>'id'=any(ids) then return false; end if;
    ids:=array_append(ids,foto->>'id');
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function private.fotos_comunidad_validas(jsonb) from public,anon;
grant execute on function private.fotos_comunidad_validas(jsonb) to authenticated;
alter table public.publicaciones add column fotos jsonb not null default '[]'::jsonb;
alter table public.publicaciones add constraint comunidad_fotos_validas check(private.fotos_comunidad_validas(fotos));
alter table public.publicaciones drop constraint comunidad_publicacion_texto;
alter table public.publicaciones add constraint comunidad_publicacion_texto
check(char_length(contenido)<=2000 and (contenido ~ '[^[:space:]]' or jsonb_array_length(fotos)>0));
-- imagen_url sigue inutilizable: nunca aceptar URL pública, ajena o libre.

create or replace function private.proteger_texto_comunidad() returns trigger
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
  if tg_table_name='publicaciones' then
    if not private.fotos_comunidad_validas(new.fotos) or char_length(new.contenido)>2000
       or (new.contenido !~ '[^[:space:]]' and jsonb_array_length(new.fotos)=0) then
      raise exception using errcode='22023',message='Agregá un mensaje o hasta cuatro fotos válidas.';
    end if;
    if tg_op='UPDATE' then
      if new.fotos is distinct from old.fotos and (autora<>uid or old.oculta_en is not null or old.retirada_en is not null) then
        raise exception using errcode='42501',message='Solo la autora puede editar las fotos de su publicación activa.';
      end if;
    end if;
  elsif char_length(btrim(new.contenido)) not between 1 and limite or new.contenido !~ '[^[:space:]]' then
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
