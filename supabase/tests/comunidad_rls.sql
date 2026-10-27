-- Prueba transaccional: ninguna cuenta, mensaje o reacción de QA se confirma.
-- Ejecutar como rol de mantenimiento capaz de SET LOCAL ROLE authenticated.
-- No recibe secretos ni toca perfiles reales. ROLLBACK obligatorio al final.
begin;
set local request.jwt.claims='{"role":"service_role"}';
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','community-one@example.invalid','{"nombre":"QA Socia uno"}'),
 ('10000000-0000-4000-8000-000000000002','community-two@example.invalid','{"nombre":"QA Socia dos"}'),
 ('10000000-0000-4000-8000-000000000003','community-free@example.invalid','{"nombre":"QA Gratuita"}'),
 ('10000000-0000-4000-8000-000000000004','community-paused@example.invalid','{"nombre":"QA Pausada"}'),
 ('10000000-0000-4000-8000-000000000005','community-admin@example.invalid','{"nombre":"QA Equipo"}');
update public.perfiles set tipo_usuario='socia',estado='activa' where id in
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
update public.perfiles set tipo_usuario='socia',estado='pausada' where id='10000000-0000-4000-8000-000000000004';
update public.perfiles set rol='admin' where id='10000000-0000-4000-8000-000000000005';

set local role authenticated;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
insert into public.publicaciones(id,alumna_id,contenido,tipo) values
 ('20000000-0000-4000-8000-000000000001',auth.uid(),'Prueba transaccional: primer avance.','avance');
do $$
begin
  if not private.puede_usar_comunidad() then raise exception 'QA: Socia activa sin acceso'; end if;
  if (select count(*) from public.perfiles where id='10000000-0000-4000-8000-000000000002')<>0 then raise exception 'QA: perfil ajeno visible'; end if;
  if (select count(*) from public.obtener_autores_comunidad(array['10000000-0000-4000-8000-000000000003'::uuid]))<>0 then raise exception 'QA: directorio arbitrario'; end if;
  begin
    update public.perfiles set rol='admin' where id=auth.uid();
    raise exception 'QA: se permitió autopromoción';
  exception when insufficient_privilege then null; when raise_exception then
    if sqlerrm='QA: se permitió autopromoción' then raise; end if;
  end;
  begin
    delete from public.perfiles where id=auth.uid();
    raise exception 'QA: se permitió borrar perfil';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.publicaciones(alumna_id,contenido) values ('10000000-0000-4000-8000-000000000002','No soy la autora');
    raise exception 'QA: se permitió suplantar autora';
  exception when insufficient_privilege then null; end;
  begin
    update public.publicaciones set oculta_en=now(),motivo_moderacion='Moderación falsa' where id='20000000-0000-4000-8000-000000000001';
    raise exception 'QA: alumna pudo moderar';
  exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
insert into public.comentarios(id,publicacion_id,autor_id,contenido) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',auth.uid(),'Te felicito por tu avance.');
insert into public.reacciones(publicacion_id,alumna_id,tipo) values ('20000000-0000-4000-8000-000000000001',auth.uid(),'felicitar');
do $$
declare resumen record; cambiadas integer;
begin
  select * into resumen from public.obtener_resumen_comunidad(array['20000000-0000-4000-8000-000000000001'::uuid]);
  if not found or resumen.total_comentarios is distinct from 1 or resumen.total_felicitaciones is distinct from 1 or resumen.felicitada is distinct from true then raise exception 'QA: conteos incoherentes'; end if;
  update public.publicaciones set contenido='Texto ajeno cambiado' where id='20000000-0000-4000-8000-000000000001';
  get diagnostics cambiadas=row_count;
  if cambiadas<>0 then raise exception 'QA: se editó un mensaje ajeno'; end if;
  begin
    insert into public.reacciones(publicacion_id,alumna_id,tipo) values ('20000000-0000-4000-8000-000000000001',auth.uid(),'felicitar');
    raise exception 'QA: felicitación duplicada';
  exception when unique_violation then null; end;
end $$;

set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000003"}';
do $$
begin
  if private.puede_usar_comunidad() or (select count(*) from public.publicaciones)<>0 then raise exception 'QA: acceso gratuito abierto'; end if;
  begin
    insert into public.publicaciones(alumna_id,contenido) values (auth.uid(),'Gratuita no autorizada');
    raise exception 'QA: gratuita pudo publicar';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.obtener_autores_comunidad(array['10000000-0000-4000-8000-000000000001'::uuid]);
    raise exception 'QA: RPC accesible sin plan';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000004"}';
do $$ begin
  if private.puede_usar_comunidad() or (select count(*) from public.publicaciones)<>0 then raise exception 'QA: acceso pausado abierto'; end if;
end $$;

set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000005"}';
update public.publicaciones set oculta_en=now(),moderada_por=auth.uid(),motivo_moderacion='Revisión de prueba' where id='20000000-0000-4000-8000-000000000001' and version=1;
do $$ declare resumen record; begin
  if (select version from public.publicaciones where id='20000000-0000-4000-8000-000000000001') is distinct from 2 then raise exception 'QA: versión de moderación incorrecta'; end if;
  select * into resumen from public.obtener_resumen_comunidad(array['20000000-0000-4000-8000-000000000001'::uuid]);
  if not found or resumen.total_felicitaciones is distinct from 1 then raise exception 'QA: moderación perdió conteo'; end if;
  begin
    update public.publicaciones set contenido='No editar el texto ajeno' where id='20000000-0000-4000-8000-000000000001';
    raise exception 'QA: admin editó texto ajeno';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
do $$ begin
  if exists(select 1 from public.publicaciones where id='20000000-0000-4000-8000-000000000001') then raise exception 'QA: oculta visible para otra socia'; end if;
  begin
    insert into public.comentarios(publicacion_id,autor_id,contenido) values ('20000000-0000-4000-8000-000000000001',auth.uid(),'No comentar ocultos');
    raise exception 'QA: comentario sobre mensaje oculto';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
do $$ begin
  begin
    update public.publicaciones set oculta_en=null where id='20000000-0000-4000-8000-000000000001';
    raise exception 'QA: autora eludió moderación';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000005"}';
update public.publicaciones set oculta_en=null,moderada_por=auth.uid(),motivo_moderacion=null where id='20000000-0000-4000-8000-000000000001' and version=2;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
update public.publicaciones set contenido='Prueba editada, confirmada con versión.' where id='20000000-0000-4000-8000-000000000001' and version=3;
update public.publicaciones set retirada_en=now() where id='20000000-0000-4000-8000-000000000001' and version=4;
do $$ begin
  if (select version from public.publicaciones where id='20000000-0000-4000-8000-000000000001') is distinct from 5 then raise exception 'QA: versiones no incrementadas'; end if;
end $$;
update public.publicaciones set retirada_en=null where id='20000000-0000-4000-8000-000000000001' and version=5;

-- La misma protección también debe funcionar con la forma de fila comentario.
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
update public.comentarios set contenido='Respuesta editada por su autora.' where id='30000000-0000-4000-8000-000000000001' and version=1;
do $$ begin
  if (select version from public.comentarios where id='30000000-0000-4000-8000-000000000001') is distinct from 2 then raise exception 'QA: edición de comentario no confirmada'; end if;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000005"}';
update public.comentarios set oculta_en=now(),moderada_por=auth.uid(),motivo_moderacion='Moderación de comentario QA' where id='30000000-0000-4000-8000-000000000001' and version=2;
do $$ begin
  if (select version from public.comentarios where id='30000000-0000-4000-8000-000000000001') is distinct from 3 then raise exception 'QA: moderación de comentario no confirmada'; end if;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
do $$ begin
  if exists(select 1 from public.comentarios where id='30000000-0000-4000-8000-000000000001') then raise exception 'QA: comentario oculto visible a otra socia'; end if;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000005"}';
update public.comentarios set oculta_en=null,moderada_por=auth.uid(),motivo_moderacion=null where id='30000000-0000-4000-8000-000000000001' and version=3;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
update public.comentarios set retirada_en=now() where id='30000000-0000-4000-8000-000000000001' and version=4;
do $$ declare resumen record; begin
  select * into resumen from public.obtener_resumen_comunidad(array['20000000-0000-4000-8000-000000000001'::uuid]);
  if not found or resumen.total_comentarios is distinct from 0 then raise exception 'QA: comentario retirado contado como activo'; end if;
end $$;
update public.comentarios set retirada_en=null where id='30000000-0000-4000-8000-000000000001' and version=5;
do $$ begin
  if (select version from public.comentarios where id='30000000-0000-4000-8000-000000000001') is distinct from 6 then raise exception 'QA: restauración de comentario no confirmada'; end if;
end $$;

-- La alumna real de prueba puede ensayar sin aparecer a otras socias.
-- La base valida forma/autoría; existencia y bytes se comprueban además en la API.
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
insert into public.publicaciones(id,alumna_id,contenido,fotos) values
 ('20000000-0000-4000-8000-000000000003',auth.uid(),'','[{"id":"40000000-0000-4000-8000-000000000001","ancho":10,"alto":20}]');
do $$ begin
  if (select jsonb_array_length(fotos) from public.publicaciones where id='20000000-0000-4000-8000-000000000003') is distinct from 1 then raise exception 'QA: foto opcional no conservada'; end if;
  if private.fotos_comunidad_validas('[{"id":"40000000-0000-4000-8000-000000000001","ancho":10,"alto":20,"url":"https://ajeno.invalid"}]') then raise exception 'QA: URL arbitraria permitida'; end if;
  if private.fotos_comunidad_validas('[{"id":"40000000-0000-4000-8000-000000000001","ancho":3000,"alto":20}]') then raise exception 'QA: dimensión excesiva permitida'; end if;
  if private.fotos_comunidad_validas('[{"id":"40000000-0000-4000-8000-000000000001","ancho":10,"alto":20},{"id":"40000000-0000-4000-8000-000000000001","ancho":10,"alto":20}]') then raise exception 'QA: foto duplicada permitida'; end if;
  begin
    insert into public.publicaciones(alumna_id,contenido,fotos) values(auth.uid(),'','[]');
    raise exception 'QA: publicación completamente vacía permitida';
  exception when invalid_parameter_value then null; when check_violation then null; end;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000005"}';
do $$ begin
  begin
    update public.publicaciones set fotos='[{"id":"40000000-0000-4000-8000-000000000002","ancho":10,"alto":20}]' where id='20000000-0000-4000-8000-000000000003';
    raise exception 'QA: administración reemplazó fotos ajenas';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
update public.publicaciones set retirada_en=now() where id='20000000-0000-4000-8000-000000000003' and version=1;
do $$ begin
  begin
    update public.publicaciones set fotos='[{"id":"40000000-0000-4000-8000-000000000002","ancho":10,"alto":20}]' where id='20000000-0000-4000-8000-000000000003';
    raise exception 'QA: fotos editadas sobre publicación retirada';
  exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claims='{"role":"authenticated","sub":"06bb7999-997b-49c8-ba80-b8d05bca4a84"}';
insert into public.publicaciones(id,alumna_id,contenido,tipo) values
 ('20000000-0000-4000-8000-000000000002',auth.uid(),'QA aislada de alumnas reales.','idea');
insert into public.comentarios(publicacion_id,autor_id,contenido) values ('20000000-0000-4000-8000-000000000001',auth.uid(),'Comentario de prueba aislado.');
insert into public.reacciones(publicacion_id,alumna_id,tipo) values ('20000000-0000-4000-8000-000000000001',auth.uid(),'felicitar');
set local request.jwt.claims='{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
do $$ declare resumen record; begin
  if exists(select 1 from public.publicaciones where id='20000000-0000-4000-8000-000000000002') then raise exception 'QA: prueba visible a socias reales'; end if;
  select * into resumen from public.obtener_resumen_comunidad(array['20000000-0000-4000-8000-000000000001'::uuid]);
  if not found or resumen.total_comentarios is distinct from 1 or resumen.total_felicitaciones is distinct from 1 then raise exception 'QA: prueba incluida en conteos reales'; end if;
end $$;

set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $$ begin
  begin
    perform count(*) from public.publicaciones;
    raise exception 'QA: anónima con lectura';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.obtener_autores_comunidad(array['10000000-0000-4000-8000-000000000001'::uuid]);
    raise exception 'QA: anónima con RPC';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
