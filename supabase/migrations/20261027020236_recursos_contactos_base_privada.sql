-- Base privada de recursos y contactos; no activa integraciones ni entregas.
-- No crea recursos, contactos, campañas, credenciales o automatizaciones.
create table public.crm_recursos (
 id uuid primary key default gen_random_uuid(), nombre text not null,
 slug text not null unique, orientacion text not null, url text,
 estado text not null default 'borrador' check(estado='borrador'),
 version integer not null default 1 check(version between 1 and 1000000000),
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), creada_por uuid,
 check(char_length(btrim(nombre)) between 1 and 120),
 check(char_length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 check(orientacion in ('marca_personal','sin_mostrarse','ambas')),
 check(url is null or (char_length(url)<=2000 and url ~ '^https://[^/@[:space:]]+([/?#]|$)' and url !~ '^https://[^/]*@'))
);
create table public.crm_contactos (
 id uuid primary key default gen_random_uuid(), nombre text not null,
 email_normalizado text, telefono text, fuente text not null, referencia_externa text,
 segmento_camara text not null default 'sin_definir', perfil_id uuid references public.perfiles(id),
 vinculo_confirmado_en timestamptz, vinculo_confirmado_por uuid, cliente_confirmado boolean not null default false,
 version integer not null default 1 check(version between 1 and 1000000000),
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), creada_por uuid,
 check(char_length(btrim(nombre)) between 1 and 120),
 check(email_normalizado is not null or telefono is not null),
 check(email_normalizado is null or (char_length(email_normalizado)<=254 and email_normalizado=lower(btrim(email_normalizado)) and email_normalizado ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
 check(telefono is null or telefono ~ '^[+]?[0-9]{7,15}$'),
 check(fuente in ('manual','manychat','sndflow','otra')),
 check(referencia_externa is null or char_length(btrim(referencia_externa)) between 1 and 200),
 check(segmento_camara in ('si','no','sin_definir')),
 check((perfil_id is null and vinculo_confirmado_en is null and vinculo_confirmado_por is null and not cliente_confirmado)
    or (perfil_id is not null and vinculo_confirmado_en is not null and vinculo_confirmado_por is not null))
);
create table public.crm_eventos (
 id uuid primary key default gen_random_uuid(), contacto_id uuid not null references public.crm_contactos(id),
 recurso_id uuid references public.crm_recursos(id), tipo text not null, fuente text not null,
 referencia_externa text, observado_en timestamptz not null, creado_en timestamptz not null default now(), creada_por uuid,
 check(tipo in ('solicitud','clic','entrega_iniciada','info_socias','interes_vigente')),
 check(fuente in ('manual','manychat','sndflow','otra')),
 check(referencia_externa is null or char_length(btrim(referencia_externa)) between 1 and 200),
 check(tipo not in ('solicitud','clic','entrega_iniciada') or recurso_id is not null)
);
create index crm_contactos_orden on public.crm_contactos(creado_en desc,id desc);
create index crm_contactos_segmento on public.crm_contactos(segmento_camara,creado_en desc,id desc);
create index crm_contactos_fuente on public.crm_contactos(fuente,creado_en desc,id desc);
create index crm_contactos_perfil on public.crm_contactos(perfil_id);
create index crm_contactos_email on public.crm_contactos(email_normalizado) where email_normalizado is not null;
create unique index crm_contacto_fuente_referencia on public.crm_contactos(fuente,referencia_externa) where referencia_externa is not null;
create index crm_eventos_contacto_orden on public.crm_eventos(contacto_id,creado_en desc,id desc);
create index crm_eventos_recurso on public.crm_eventos(recurso_id);
create unique index crm_evento_fuente_referencia on public.crm_eventos(fuente,referencia_externa) where referencia_externa is not null;
alter table public.crm_recursos enable row level security;
alter table public.crm_contactos enable row level security;
alter table public.crm_eventos enable row level security;
revoke all on public.crm_recursos,public.crm_contactos,public.crm_eventos from public,anon,authenticated;
grant select,insert,update on public.crm_recursos,public.crm_contactos to authenticated;
grant select,insert on public.crm_eventos to authenticated;
create policy crm_recursos_admin_select on public.crm_recursos for select to authenticated using((select public.es_admin()));
create policy crm_recursos_admin_insert on public.crm_recursos for insert to authenticated with check((select public.es_admin()));
create policy crm_recursos_admin_update on public.crm_recursos for update to authenticated using((select public.es_admin())) with check((select public.es_admin()));
create policy crm_contactos_admin_select on public.crm_contactos for select to authenticated using((select public.es_admin()));
create policy crm_contactos_admin_insert on public.crm_contactos for insert to authenticated with check((select public.es_admin()));
create policy crm_contactos_admin_update on public.crm_contactos for update to authenticated using((select public.es_admin())) with check((select public.es_admin()));
create policy crm_eventos_admin_select on public.crm_eventos for select to authenticated using((select public.es_admin()));
create policy crm_eventos_admin_insert on public.crm_eventos for insert to authenticated with check((select public.es_admin()));
create function private.proteger_crm() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (select auth.uid()) is null or not (select public.es_admin()) then raise exception using errcode='42501',message='CRM reservado a administración.'; end if;
 if tg_op='INSERT' then
   if tg_table_name<>'crm_eventos' then
     if new.version<>1 then raise exception using errcode='22023',message='Versión inicial no válida.'; end if;
     new.actualizado_en:=statement_timestamp();
   else
     if new.observado_en<'2000-01-01T00:00:00Z'::timestamptz or new.observado_en>statement_timestamp() then raise exception using errcode='22023',message='Fecha de observación no válida.'; end if;
   end if;
   if tg_table_name='crm_contactos' then
     if new.perfil_id is not null or new.vinculo_confirmado_en is not null or new.vinculo_confirmado_por is not null or new.cliente_confirmado then raise exception using errcode='42501',message='El vínculo requiere un circuito de confirmación independiente.'; end if;
   end if;
   new.creado_en:=statement_timestamp(); new.creada_por:=(select auth.uid()); return new;
 end if;
 if tg_table_name='crm_eventos' then raise exception using errcode='42501',message='El historial es inmutable.'; end if;
 if new.id is distinct from old.id or new.creado_en is distinct from old.creado_en or new.creada_por is distinct from old.creada_por or new.version is distinct from old.version then raise exception using errcode='42501',message='No cambiar la identidad del registro.'; end if;
 if tg_table_name='crm_contactos' then
   if new.perfil_id is distinct from old.perfil_id or new.vinculo_confirmado_en is distinct from old.vinculo_confirmado_en or new.vinculo_confirmado_por is distinct from old.vinculo_confirmado_por or new.cliente_confirmado is distinct from old.cliente_confirmado then raise exception using errcode='42501',message='El vínculo requiere un circuito de confirmación independiente.'; end if;
 end if;
 new.version:=old.version+1; new.actualizado_en:=statement_timestamp(); return new;
end;
$$;
revoke all on function private.proteger_crm() from public,anon,authenticated;
create trigger proteger_recurso_crm before insert or update on public.crm_recursos for each row execute function private.proteger_crm();
create trigger proteger_contacto_crm before insert or update on public.crm_contactos for each row execute function private.proteger_crm();
create trigger proteger_evento_crm before insert or update on public.crm_eventos for each row execute function private.proteger_crm();
create function public.resumen_crm_contactos(p_ids uuid[])
returns table(contacto_id uuid,recursos_distintos bigint,pidio_info boolean,interes_vigente_en timestamptz)
language plpgsql stable security invoker set search_path='' as $$
begin
 if not (select public.es_admin()) then raise exception using errcode='42501',message='CRM reservado a administración.'; end if;
 if p_ids is null or cardinality(p_ids)>50 then raise exception using errcode='22023',message='Consulta demasiado amplia.'; end if;
 return query select c.id,
   (select count(distinct e.recurso_id) from public.crm_eventos e where e.contacto_id=c.id and e.tipo='solicitud'),
   exists(select 1 from public.crm_eventos e where e.contacto_id=c.id and e.tipo='info_socias'),
   (select max(e.observado_en) from public.crm_eventos e where e.contacto_id=c.id and e.tipo='interes_vigente')
 from public.crm_contactos c where c.id=any(p_ids);
end;
$$;
revoke all on function public.resumen_crm_contactos(uuid[]) from public,anon;
grant execute on function public.resumen_crm_contactos(uuid[]) to authenticated;
