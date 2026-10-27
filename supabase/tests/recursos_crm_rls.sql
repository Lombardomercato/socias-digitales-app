-- Prueba de integración transaccional del CRM interno. Ejecutar completa, después
-- de su migración, con un rol de mantenimiento capaz de SET LOCAL ROLE.
-- No envía mensajes, no usa cuentas reales y no confirma datos de QA.
-- Los UUID y dominios reservados no deben reutilizar registros existentes.
-- Ante cualquier excepción abortar la ejecución y hacer ROLLBACK; nunca COMMIT.
begin;
set local statement_timeout='30s';
set local request.jwt.claims='{"role":"service_role"}';

do $qa$
begin
  if exists(select 1 from auth.users where id::text like '11000000-0000-4000-8000-%'
      or email in ('crm-admin@example.invalid','crm-socia@example.invalid',
                  'crm-equipo@example.invalid','crm-gratuita@example.invalid'))
    or exists(select 1 from public.perfiles where id::text like '11000000-0000-4000-8000-%')
    or exists(select 1 from public.crm_recursos where id::text like '21000000-0000-4000-8000-%')
    or exists(select 1 from public.crm_contactos where id::text like '31000000-0000-4000-8000-%')
    or exists(select 1 from public.crm_eventos where id::text like '41000000-0000-4000-8000-%')
  then raise exception 'QA CRM: el espacio reservado ya existe; no se modificó ningún registro.'; end if;
  if (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('crm_recursos','crm_contactos','crm_eventos')
        and c.relrowsecurity)<>3
  then raise exception 'QA CRM: falta RLS en alguna tabla.'; end if;
end $qa$;

insert into auth.users(id,email,raw_user_meta_data) values
 ('11000000-0000-4000-8000-000000000001','crm-admin@example.invalid','{"nombre":"QA CRM Admin"}'),
 ('11000000-0000-4000-8000-000000000002','crm-socia@example.invalid','{"nombre":"QA CRM Socia"}'),
 ('11000000-0000-4000-8000-000000000003','crm-equipo@example.invalid','{"nombre":"QA CRM Equipo"}'),
 ('11000000-0000-4000-8000-000000000004','crm-gratuita@example.invalid','{"nombre":"QA CRM Gratuita"}');
update public.perfiles set rol='admin',estado='activa' where id in
 ('11000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000003');
update public.perfiles set tipo_usuario='socia',estado='activa'
 where id='11000000-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claims='{"role":"authenticated","sub":"11000000-0000-4000-8000-000000000001"}';

-- Los ID explícitos son la clave de idempotencia admitida al crear. La autoría
-- y las fechas enviadas por el cliente, en cambio, se reemplazan en el trigger.
insert into public.crm_recursos(id,nombre,slug,orientacion,url,creada_por,creado_en,actualizado_en) values
 ('21000000-0000-4000-8000-000000000001','QA Recurso uno','qa-crm-rollback-uno','marca_personal','https://example.invalid/uno',
  '11000000-0000-4000-8000-000000000003','2001-01-01T00:00:00Z','2001-01-01T00:00:00Z'),
 ('21000000-0000-4000-8000-000000000002','QA Recurso dos','qa-crm-rollback-dos','sin_mostrarse','https://example.invalid/dos?origen=qa',
  null,'2001-01-01T00:00:00Z','2001-01-01T00:00:00Z'),
 ('21000000-0000-4000-8000-000000000003','QA Recurso tres','qa-crm-rollback-tres','ambas',null,
  null,'2001-01-01T00:00:00Z','2001-01-01T00:00:00Z');
insert into public.crm_contactos(id,nombre,email_normalizado,telefono,fuente,referencia_externa,creada_por,creado_en,actualizado_en) values
 ('31000000-0000-4000-8000-000000000001','QA Contacto con señales','crm-socia@example.invalid','+5491100000001','manual','qa-crm-rollback-contacto-uno',
  '11000000-0000-4000-8000-000000000003','2001-01-01T00:00:00Z','2001-01-01T00:00:00Z'),
 ('31000000-0000-4000-8000-000000000002','QA Contacto teléfono',null,'1100000002','manychat','qa-crm-rollback-contacto-dos',
  null,'2001-01-01T00:00:00Z','2001-01-01T00:00:00Z'),
 ('31000000-0000-4000-8000-000000000003','QA Contacto sin señales','crm-sin-eventos@example.invalid',null,'sndflow',null,
  null,'2001-01-01T00:00:00Z','2001-01-01T00:00:00Z');
insert into public.crm_eventos(id,contacto_id,recurso_id,tipo,fuente,referencia_externa,observado_en,creada_por,creado_en) values
 ('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','solicitud','manual','qa-crm-rollback-evento-uno',now()-interval '2 days',
  '11000000-0000-4000-8000-000000000003','2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','solicitud','manychat',null,now()-interval '2 days',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','solicitud','sndflow',null,now()-interval '1 day',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000004','31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','clic','otra',null,now()-interval '1 day',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000005','31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','entrega_iniciada','manual',null,now()-interval '1 day',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000006','31000000-0000-4000-8000-000000000001',null,'info_socias','manual',null,now()-interval '1 day',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000007','31000000-0000-4000-8000-000000000001',null,'interes_vigente','manual',null,now()-interval '1 day',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000008','31000000-0000-4000-8000-000000000001',null,'interes_vigente','manual',null,now()-interval '1 hour',null,'2001-01-01T00:00:00Z'),
 ('41000000-0000-4000-8000-000000000009','31000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000003','clic','manychat',null,now()-interval '1 hour',null,'2001-01-01T00:00:00Z');

do $qa$
declare tabla text;
begin
  if not public.es_admin() then raise exception 'QA CRM: admin ficticia sin acceso.'; end if;
  if (select count(*) from public.crm_recursos where id::text like '21000000-0000-4000-8000-%')<>3
    or (select count(*) from public.crm_contactos where id::text like '31000000-0000-4000-8000-%')<>3
    or (select count(*) from public.crm_eventos where id::text like '41000000-0000-4000-8000-%')<>9
  then raise exception 'QA CRM: creación o lectura administrativa incompleta.'; end if;
  if exists(select 1 from public.crm_recursos where id::text like '21000000-0000-4000-8000-%'
      and (creada_por is distinct from auth.uid() or creado_en<transaction_timestamp()
        or creado_en is distinct from actualizado_en or version<>1 or estado<>'borrador'))
    or exists(select 1 from public.crm_contactos where id::text like '31000000-0000-4000-8000-%'
      and (creada_por is distinct from auth.uid() or creado_en<transaction_timestamp()
        or creado_en is distinct from actualizado_en or version<>1))
    or exists(select 1 from public.crm_eventos where id::text like '41000000-0000-4000-8000-%'
      and (creada_por is distinct from auth.uid() or creado_en<transaction_timestamp()))
  then raise exception 'QA CRM: se aceptó autoría, versión o fecha de creación del cliente.'; end if;
  -- Coincidir con el email de una cuenta NO confirma identidad ni compra.
  if exists(select 1 from public.crm_contactos where id::text like '31000000-0000-4000-8000-%'
      and (perfil_id is not null or vinculo_confirmado_en is not null
        or vinculo_confirmado_por is not null or cliente_confirmado))
  then raise exception 'QA CRM: se vinculó o convirtió un contacto sin confirmación.'; end if;
  foreach tabla in array array['crm_recursos','crm_contactos','crm_eventos'] loop
    if has_table_privilege('authenticated','public.'||tabla,'DELETE')
      or has_table_privilege('authenticated','public.'||tabla,'TRUNCATE')
    then raise exception 'QA CRM: privilegio destructivo en %.',tabla; end if;
    if has_table_privilege('anon','public.'||tabla,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
    then raise exception 'QA CRM: anon tiene privilegios de tabla en %.',tabla; end if;
  end loop;
  if has_table_privilege('authenticated','public.crm_eventos','UPDATE')
  then raise exception 'QA CRM: el historial tiene grant UPDATE.'; end if;
  if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='private' and p.proname='proteger_crm'
        and (p.prosecdef or has_function_privilege('authenticated',p.oid,'EXECUTE')
          or has_function_privilege('anon',p.oid,'EXECUTE')))
    or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='resumen_crm_contactos'
        and (p.prosecdef or has_function_privilege('anon',p.oid,'EXECUTE')))
  then raise exception 'QA CRM: RPC o trigger con elevación/grants indebidos.'; end if;
end $qa$;

-- Cada caso exige un SQLSTATE concreto. La excepción de "se permitió" NO se
-- absorbe: si una validación desaparece, la prueba completa falla y revierte.
do $qa$
declare caso record;
begin
  for caso in select * from (values
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion) values(' ','qa-invalido','ambas')$sql$,'23514','nombre de recurso vacío'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion) values('QA',repeat('a',101),'ambas')$sql$,'23514','slug demasiado largo'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion) values('QA','Slug Invalido','ambas')$sql$,'23514','slug no normalizado'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion) values('QA','qa-invalido','inventada')$sql$,'23514','orientación desconocida'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion,estado) values('QA','qa-invalido','ambas','publicado')$sql$,'23514','publicación aún no implementada'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion,url) values('QA','qa-invalido','ambas','http://example.invalid')$sql$,'23514','URL sin HTTPS'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion,url) values('QA','qa-invalido','ambas','javascript:alert(1)')$sql$,'23514','URL ejecutable'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion,url) values('QA','qa-invalido','ambas','https://usuario:clave@example.invalid')$sql$,'23514','credenciales en URL'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion,version) values('QA','qa-invalido','ambas',2)$sql$,'22023','versión inicial de recurso'),
    ($sql$insert into public.crm_recursos(nombre,slug,orientacion) values('QA','qa-crm-rollback-uno','ambas')$sql$,'23505','slug duplicado'),
    ($sql$insert into public.crm_contactos(nombre,fuente) values('QA','manual')$sql$,'23514','contacto sin email ni teléfono'),
    ($sql$insert into public.crm_contactos(nombre,email_normalizado,fuente) values('QA','sin-arroba','manual')$sql$,'23514','email inválido'),
    ($sql$insert into public.crm_contactos(nombre,email_normalizado,fuente) values('QA','MAYUSCULA@example.invalid','manual')$sql$,'23514','email sin normalizar'),
    ($sql$insert into public.crm_contactos(nombre,email_normalizado,fuente) values('QA',' qa@example.invalid ','manual')$sql$,'23514','email con espacios'),
    ($sql$insert into public.crm_contactos(nombre,email_normalizado,fuente) values('QA',repeat('a',240)||'@example.invalid','manual')$sql$,'23514','email demasiado largo'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente) values('QA','123456','manual')$sql$,'23514','teléfono corto'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente) values('QA','1234567890123456','manual')$sql$,'23514','teléfono largo'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente) values('QA','+54 91100000001','manual')$sql$,'23514','teléfono no normalizado'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente) values('QA','1100000000','desconocida')$sql$,'23514','fuente desconocida'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,segmento_camara) values('QA','1100000000','manual','quizas')$sql$,'23514','segmento desconocido'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,referencia_externa) values('QA','1100000000','manual',' ')$sql$,'23514','referencia vacía'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,referencia_externa) values('QA','1100000000','manual',repeat('a',201))$sql$,'23514','referencia demasiado larga'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,referencia_externa) values('QA','1100000000','manual','qa-crm-rollback-contacto-uno')$sql$,'23505','contacto duplicado por fuente/referencia'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,version) values('QA','1100000000','manual',2)$sql$,'22023','versión inicial de contacto'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,perfil_id) values('QA','1100000000','manual','11000000-0000-4000-8000-000000000002')$sql$,'42501','perfil al crear contacto'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,vinculo_confirmado_en) values('QA','1100000000','manual',now())$sql$,'42501','fecha de vínculo al crear'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,vinculo_confirmado_por) values('QA','1100000000','manual',auth.uid())$sql$,'42501','confirmador al crear'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,cliente_confirmado) values('QA','1100000000','manual',true)$sql$,'42501','cliente confirmado al crear'),
    ($sql$insert into public.crm_contactos(nombre,telefono,fuente,perfil_id,vinculo_confirmado_en,vinculo_confirmado_por,cliente_confirmado) values('QA','1100000000','manual','11000000-0000-4000-8000-000000000002',now(),auth.uid(),true)$sql$,'42501','vínculo completo sin circuito de confirmación'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','solicitud','manual',now())$sql$,'23514','solicitud sin recurso'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','clic','manual',now())$sql$,'23514','clic sin recurso'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','entrega_iniciada','manual',now())$sql$,'23514','entrega sin recurso'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','compra','manual',now())$sql$,'23514','tipo de evento inventado'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','desconocida',now())$sql$,'23514','fuente de evento inventada'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,referencia_externa,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','manual',' ',now())$sql$,'23514','referencia de evento vacía'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','manual','1999-12-31T23:59:59Z')$sql$,'22023','observación anterior al límite'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','manual',clock_timestamp()+interval '1 day')$sql$,'22023','observación futura'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000099','info_socias','manual',now())$sql$,'23503','evento sin contacto existente'),
    ($sql$insert into public.crm_eventos(contacto_id,recurso_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000099','solicitud','manual',now())$sql$,'23503','evento sin recurso existente'),
    ($sql$insert into public.crm_eventos(contacto_id,tipo,fuente,referencia_externa,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','manual','qa-crm-rollback-evento-uno',now())$sql$,'23505','evento duplicado por fuente/referencia')
  ) as casos(sentencia,esperado,etiqueta) loop
    begin
      execute caso.sentencia;
      raise exception 'QA CRM: se permitió %.',caso.etiqueta;
    exception when others then
      if sqlstate<>caso.esperado then
        raise exception 'QA CRM: % esperaba SQLSTATE %, recibió %: %',caso.etiqueta,caso.esperado,sqlstate,sqlerrm;
      end if;
    end;
  end loop;
end $qa$;

-- La versión la incrementa la base, nunca el cuerpo enviado por el cliente.
do $qa$
declare cambiadas integer;
begin
  update public.crm_recursos set nombre='QA Recurso uno editado',actualizado_en='2001-01-01T00:00:00Z'
    where id='21000000-0000-4000-8000-000000000001' and version=1;
  get diagnostics cambiadas=row_count;
  if cambiadas<>1 or (select version from public.crm_recursos where id='21000000-0000-4000-8000-000000000001') is distinct from 2
    or (select actualizado_en<transaction_timestamp() from public.crm_recursos where id='21000000-0000-4000-8000-000000000001')
  then raise exception 'QA CRM: CAS o fecha de recurso incorrectos.'; end if;
  update public.crm_recursos set nombre='QA Sobrescritura obsoleta'
    where id='21000000-0000-4000-8000-000000000001' and version=1;
  get diagnostics cambiadas=row_count;
  if cambiadas<>0 or (select nombre from public.crm_recursos where id='21000000-0000-4000-8000-000000000001') is distinct from 'QA Recurso uno editado'
  then raise exception 'QA CRM: una edición obsoleta sobrescribió un recurso.'; end if;
  update public.crm_contactos set segmento_camara='si',actualizado_en='2001-01-01T00:00:00Z'
    where id='31000000-0000-4000-8000-000000000001' and version=1;
  get diagnostics cambiadas=row_count;
  if cambiadas<>1 or (select version from public.crm_contactos where id='31000000-0000-4000-8000-000000000001') is distinct from 2
    or (select actualizado_en<transaction_timestamp() from public.crm_contactos where id='31000000-0000-4000-8000-000000000001')
  then raise exception 'QA CRM: CAS o fecha de contacto incorrectos.'; end if;
  update public.crm_contactos set segmento_camara='no'
    where id='31000000-0000-4000-8000-000000000001' and version=1;
  get diagnostics cambiadas=row_count;
  if cambiadas<>0 or (select segmento_camara from public.crm_contactos where id='31000000-0000-4000-8000-000000000001') is distinct from 'si'
  then raise exception 'QA CRM: una edición obsoleta sobrescribió un contacto.'; end if;
end $qa$;

do $qa$
declare caso record;
begin
  for caso in select * from (values
    ($sql$update public.crm_recursos set id='21000000-0000-4000-8000-000000000099' where id='21000000-0000-4000-8000-000000000001'$sql$,'identidad de recurso'),
    ($sql$update public.crm_recursos set creada_por='11000000-0000-4000-8000-000000000003' where id='21000000-0000-4000-8000-000000000001'$sql$,'autoría de recurso'),
    ($sql$update public.crm_recursos set creado_en='2001-01-01T00:00:00Z' where id='21000000-0000-4000-8000-000000000001'$sql$,'fecha de creación de recurso'),
    ($sql$update public.crm_recursos set version=500 where id='21000000-0000-4000-8000-000000000001'$sql$,'versión de recurso enviada directamente'),
    ($sql$update public.crm_contactos set id='31000000-0000-4000-8000-000000000099' where id='31000000-0000-4000-8000-000000000001'$sql$,'identidad de contacto'),
    ($sql$update public.crm_contactos set creada_por='11000000-0000-4000-8000-000000000003' where id='31000000-0000-4000-8000-000000000001'$sql$,'autoría de contacto'),
    ($sql$update public.crm_contactos set creado_en='2001-01-01T00:00:00Z' where id='31000000-0000-4000-8000-000000000001'$sql$,'fecha de creación de contacto'),
    ($sql$update public.crm_contactos set version=500 where id='31000000-0000-4000-8000-000000000001'$sql$,'versión de contacto enviada directamente'),
    ($sql$update public.crm_contactos set perfil_id='11000000-0000-4000-8000-000000000002' where id='31000000-0000-4000-8000-000000000001'$sql$,'perfil al actualizar contacto'),
    ($sql$update public.crm_contactos set vinculo_confirmado_en=now() where id='31000000-0000-4000-8000-000000000001'$sql$,'fecha de confirmación de contacto'),
    ($sql$update public.crm_contactos set vinculo_confirmado_por=auth.uid() where id='31000000-0000-4000-8000-000000000001'$sql$,'confirmador de contacto'),
    ($sql$update public.crm_contactos set cliente_confirmado=true where id='31000000-0000-4000-8000-000000000001'$sql$,'compra de contacto'),
    ($sql$update public.crm_contactos set perfil_id='11000000-0000-4000-8000-000000000002',vinculo_confirmado_en=now(),vinculo_confirmado_por=auth.uid(),cliente_confirmado=true where id='31000000-0000-4000-8000-000000000001'$sql$,'vínculo completo sin confirmación'),
    ($sql$update public.crm_eventos set tipo='info_socias' where id='41000000-0000-4000-8000-000000000001'$sql$,'reescritura del historial'),
    ($sql$delete from public.crm_recursos where id='21000000-0000-4000-8000-000000000001'$sql$,'borrado de recurso'),
    ($sql$delete from public.crm_contactos where id='31000000-0000-4000-8000-000000000001'$sql$,'borrado de contacto'),
    ($sql$delete from public.crm_eventos where id='41000000-0000-4000-8000-000000000001'$sql$,'borrado de evento')
  ) as casos(sentencia,etiqueta) loop
    begin
      execute caso.sentencia;
      raise exception 'QA CRM: se permitió %.',caso.etiqueta;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $qa$;

-- El resumen entrega señales, no ventas ni una identidad deducida del email.
-- Solicitar dos veces el mismo recurso cuenta una vez; clic/entrega no cuentan
-- como solicitud; interés toma su última fecha, no la fecha de creación.
do $qa$
declare resumen record; puntos integer;
begin
  select * into resumen from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000001'::uuid]);
  if not found or resumen.contacto_id is distinct from '31000000-0000-4000-8000-000000000001'::uuid
    or resumen.recursos_distintos is distinct from 2::bigint
    or resumen.pidio_info is distinct from true
    or resumen.interes_vigente_en is distinct from
       (select observado_en from public.crm_eventos where id='41000000-0000-4000-8000-000000000008')
  then raise exception 'QA CRM: señales del contacto principal incorrectas.'; end if;
  -- Estos son exactamente los inputs de calcularInteresCrm: 20 + 40 + 10.
  puntos:=least(3,resumen.recursos_distintos)*10
    +case when resumen.pidio_info then 40 else 0 end
    +case when resumen.interes_vigente_en between now()-interval '30 days' and now() then 10 else 0 end;
  if puntos<>70 then raise exception 'QA CRM: inputs de interés incoherentes.'; end if;
  select * into resumen from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000002'::uuid]);
  if not found or resumen.recursos_distintos is distinct from 0::bigint
    or resumen.pidio_info is distinct from false or resumen.interes_vigente_en is not null
  then raise exception 'QA CRM: un clic se confundió con interés o información.'; end if;
  select * into resumen from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000003'::uuid]);
  if not found or resumen.recursos_distintos is distinct from 0::bigint
    or resumen.pidio_info is distinct from false or resumen.interes_vigente_en is not null
  then raise exception 'QA CRM: contacto sin eventos con señales inventadas.'; end if;
  if (select count(*) from public.resumen_crm_contactos(array[
      '31000000-0000-4000-8000-000000000001'::uuid,'31000000-0000-4000-8000-000000000001'::uuid,
      '31000000-0000-4000-8000-000000000002'::uuid,'31000000-0000-4000-8000-000000000003'::uuid,
      '31000000-0000-4000-8000-000000000099'::uuid]))<>3
    or (select count(*) from public.resumen_crm_contactos(array[]::uuid[]))<>0
    or (select count(*) from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000099'::uuid]))<>0
    or (select count(*) from public.resumen_crm_contactos(array_fill('31000000-0000-4000-8000-000000000001'::uuid,array[50])))<>1
  then raise exception 'QA CRM: cardinalidad, duplicados o límite inclusivo del resumen incorrectos.'; end if;
  begin
    perform * from public.resumen_crm_contactos(null::uuid[]);
    raise exception 'QA CRM: resumen aceptó array nulo.';
  exception when invalid_parameter_value then null; end;
  begin
    perform * from public.resumen_crm_contactos(array_fill('31000000-0000-4000-8000-000000000001'::uuid,array[51]));
    raise exception 'QA CRM: resumen aceptó más de 50 IDs.';
  exception when invalid_parameter_value then null; end;
  if exists(select 1 from public.crm_contactos where id::text like '31000000-0000-4000-8000-%'
      and (perfil_id is not null or vinculo_confirmado_en is not null
        or vinculo_confirmado_por is not null or cliente_confirmado))
  then raise exception 'QA CRM: interés alto se convirtió en vínculo o compra.'; end if;
end $qa$;

-- El CRM es compartido entre admins, no limitado a quien creó la fila.
set local request.jwt.claims='{"role":"authenticated","sub":"11000000-0000-4000-8000-000000000003"}';
do $qa$
declare cambiadas integer;
begin
  if not public.es_admin()
    or (select count(*) from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000001'::uuid]))<>1
  then raise exception 'QA CRM: segunda admin no puede consultar CRM.'; end if;
  update public.crm_contactos set nombre='QA Contacto editado por equipo'
    where id='31000000-0000-4000-8000-000000000003' and version=1;
  get diagnostics cambiadas=row_count;
  if cambiadas<>1 or (select version from public.crm_contactos where id='31000000-0000-4000-8000-000000000003') is distinct from 2
    or (select creada_por from public.crm_contactos where id='31000000-0000-4000-8000-000000000003') is distinct from '11000000-0000-4000-8000-000000000001'::uuid
  then raise exception 'QA CRM: edición compartida alteró autoría o versión.'; end if;
  begin
    update public.crm_contactos set creada_por=auth.uid()
      where id='31000000-0000-4000-8000-000000000003';
    raise exception 'QA CRM: segunda admin pudo apropiarse de la autoría.';
  exception when insufficient_privilege then null; end;
end $qa$;

-- Una Socia activa y una cuenta gratuita tienen cero filas visibles: ni el plan
-- de pago ni un JWT manipulado con rol=admin sustituyen el rol real del perfil.
set local request.jwt.claims='{"role":"authenticated","sub":"11000000-0000-4000-8000-000000000002","user_metadata":{"rol":"admin"}}';
do $qa$
declare cambiadas integer; sentencia text;
begin
  if public.es_admin() or (select count(*) from public.crm_recursos)<>0
    or (select count(*) from public.crm_contactos)<>0 or (select count(*) from public.crm_eventos)<>0
  then raise exception 'QA CRM: Socia o metadata de usuario accedió a información administrativa.'; end if;
  update public.crm_recursos set nombre='QA Invasión alumna' where id='21000000-0000-4000-8000-000000000001';
  get diagnostics cambiadas=row_count;
  if cambiadas<>0 then raise exception 'QA CRM: Socia editó recurso.'; end if;
  update public.crm_contactos set nombre='QA Invasión alumna' where id='31000000-0000-4000-8000-000000000001';
  get diagnostics cambiadas=row_count;
  if cambiadas<>0 then raise exception 'QA CRM: Socia editó contacto.'; end if;
  foreach sentencia in array array[
    $sql$insert into public.crm_recursos(nombre,slug,orientacion) values('QA Alumna','qa-crm-no-autorizado','ambas')$sql$,
    $sql$insert into public.crm_contactos(nombre,telefono,fuente) values('QA Alumna','1100000000','manual')$sql$,
    $sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','manual',now())$sql$,
    $sql$select * from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000001'::uuid])$sql$,
    $sql$select * from public.resumen_crm_contactos(array[]::uuid[])$sql$
  ] loop
    begin
      execute sentencia;
      raise exception 'QA CRM: Socia pudo escribir o usar RPC.';
    exception when insufficient_privilege then null; end;
  end loop;
end $qa$;

set local request.jwt.claims='{"role":"authenticated","sub":"11000000-0000-4000-8000-000000000004"}';
do $qa$
begin
  if public.es_admin() or (select count(*) from public.crm_recursos)<>0
    or (select count(*) from public.crm_contactos)<>0 or (select count(*) from public.crm_eventos)<>0
  then raise exception 'QA CRM: gratuita accedió al CRM.'; end if;
  begin
    insert into public.crm_contactos(nombre,telefono,fuente) values('QA Gratuita','1100000000','manual');
    raise exception 'QA CRM: gratuita pudo crear contactos.';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000001'::uuid]);
    raise exception 'QA CRM: gratuita pudo usar RPC.';
  exception when insufficient_privilege then null; end;
end $qa$;

set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $qa$
declare sentencia text;
begin
  foreach sentencia in array array[
    $sql$select count(*) from public.crm_recursos$sql$,
    $sql$select count(*) from public.crm_contactos$sql$,
    $sql$select count(*) from public.crm_eventos$sql$,
    $sql$insert into public.crm_recursos(nombre,slug,orientacion) values('QA Anónima','qa-crm-no-autorizado','ambas')$sql$,
    $sql$insert into public.crm_contactos(nombre,telefono,fuente) values('QA Anónima','1100000000','manual')$sql$,
    $sql$insert into public.crm_eventos(contacto_id,tipo,fuente,observado_en) values('31000000-0000-4000-8000-000000000001','info_socias','manual',now())$sql$,
    $sql$select * from public.resumen_crm_contactos(array['31000000-0000-4000-8000-000000000001'::uuid])$sql$
  ] loop
    begin
      execute sentencia;
      raise exception 'QA CRM: anónima tuvo acceso a tabla o RPC.';
    exception when insufficient_privilege then null; end;
  end loop;
end $qa$;

-- Verificación final como admin: ningún intento denegado alteró los fixtures.
set local role authenticated;
set local request.jwt.claims='{"role":"authenticated","sub":"11000000-0000-4000-8000-000000000001"}';
do $qa$
begin
  if (select count(*) from public.crm_recursos where id::text like '21000000-0000-4000-8000-%')<>3
    or (select count(*) from public.crm_contactos where id::text like '31000000-0000-4000-8000-%')<>3
    or (select count(*) from public.crm_eventos where id::text like '41000000-0000-4000-8000-%')<>9
    or (select nombre from public.crm_recursos where id='21000000-0000-4000-8000-000000000001') is distinct from 'QA Recurso uno editado'
    or (select segmento_camara from public.crm_contactos where id='31000000-0000-4000-8000-000000000001') is distinct from 'si'
    or (select tipo from public.crm_eventos where id='41000000-0000-4000-8000-000000000001') is distinct from 'solicitud'
    or exists(select 1 from public.crm_contactos where id::text like '31000000-0000-4000-8000-%'
      and (perfil_id is not null or vinculo_confirmado_en is not null
        or vinculo_confirmado_por is not null or cliente_confirmado))
  then raise exception 'QA CRM: un intento denegado dejó cambios.'; end if;
end $qa$;
rollback;
