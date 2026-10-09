create table public.preferencias_email (
  usuaria_id uuid primary key references auth.users(id) on delete cascade,
  acepta_email boolean not null default false,
  consentimiento_en timestamptz,
  actualizada_en timestamptz not null default now(),
  version text not null default 'email_avisos_2026_10_08',
  origen text not null check (origen in ('registro','perfil','baja'))
);
alter table public.preferencias_email enable row level security;
revoke all on public.preferencias_email from anon, authenticated;
grant select on public.preferencias_email to authenticated;
grant all on public.preferencias_email to service_role;
create policy "Leer preferencia propia" on public.preferencias_email for select to authenticated using ((select auth.uid()) = usuaria_id);

create table public.historial_consentimiento_email (
  id uuid primary key default gen_random_uuid(),
  usuaria_id uuid not null references auth.users(id) on delete cascade,
  acepta_email boolean not null,
  version text not null,
  origen text not null,
  creada_en timestamptz not null default now()
);
create index historial_consentimiento_email_usuaria_idx on public.historial_consentimiento_email(usuaria_id);
alter table public.historial_consentimiento_email enable row level security;
revoke all on public.historial_consentimiento_email from anon, authenticated;
grant all on public.historial_consentimiento_email to service_role;
create or replace function public.registrar_consentimiento_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.actualizada_en := now();
  new.version := 'email_avisos_2026_10_08';
  if tg_op = 'INSERT' or new.acepta_email is distinct from old.acepta_email then
    new.consentimiento_en := case when new.acepta_email then now() else null end;
    insert into public.historial_consentimiento_email(usuaria_id,acepta_email,version,origen)
    values(new.usuaria_id,new.acepta_email,new.version,new.origen);
  else
    new.consentimiento_en := old.consentimiento_en;
  end if;
  return new;
end; $$;
revoke all on function public.registrar_consentimiento_email() from public,anon,authenticated;
create trigger registrar_consentimiento_email before insert or update on public.preferencias_email
for each row execute function public.registrar_consentimiento_email();

alter table public.avisos add column email_solicitado boolean not null default false;
alter table public.avisos add column email_preparado_en timestamptz;
create table public.avisos_email_envios (
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  usuaria_id uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'pendiente' check(estado in ('pendiente','enviando','aceptado','error','omitido','revision')),
  intentos integer not null default 0,
  creada_en timestamptz not null default now(),
  primer_intento_en timestamptz,
  ultimo_intento_en timestamptz,
  proveedor_id text,
  error_codigo text,
  primary key(aviso_id,usuaria_id)
);
create index avisos_email_envios_estado_idx on public.avisos_email_envios(aviso_id,estado);
create index avisos_email_envios_usuaria_idx on public.avisos_email_envios(usuaria_id);
alter table public.avisos_email_envios enable row level security;
revoke all on public.avisos_email_envios from anon,authenticated;
grant select on public.avisos_email_envios to authenticated;
grant all on public.avisos_email_envios to service_role;
create policy "Administracion lee envios" on public.avisos_email_envios for select to authenticated using ((select public.es_admin()));

create or replace function public.preparar_emails_aviso() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.publicado and new.email_solicitado and not new.archivado and new.email_preparado_en is null then
    new.email_preparado_en := now();
  end if;
  return new;
end; $$;
revoke all on function public.preparar_emails_aviso() from public,anon,authenticated;
create trigger preparar_emails_aviso before insert or update on public.avisos for each row execute function public.preparar_emails_aviso();
create or replace function public.encolar_emails_aviso() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_preparado_en is not null and (tg_op = 'INSERT' or old.email_preparado_en is null) then
    insert into public.avisos_email_envios(aviso_id,usuaria_id)
    select new.id,p.id from public.perfiles p
    join public.preferencias_email pe on pe.usuaria_id=p.id and pe.acepta_email
    join auth.users u on u.id=p.id and u.email_confirmed_at is not null
    where p.rol <> 'admin' and p.estado='activa'
      and (case when p.tipo_usuario='socia' or p.rol in ('afiliada','afiliada_lanzamiento') then 'socia'
                when p.tipo_usuario='desafio' then 'desafio' else 'gratuito' end) = any(new.audiencias)
      and (p.tipo_usuario <> 'desafio' or coalesce(p.desafio_socias_habilitada,false)
           or p.rol in ('afiliada','afiliada_lanzamiento'))
    on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function public.encolar_emails_aviso() from public,anon,authenticated;
create trigger encolar_emails_aviso after insert or update on public.avisos for each row execute function public.encolar_emails_aviso();

create or replace function public.tomar_emails_aviso(p_aviso_id uuid)
returns setof public.avisos_email_envios language sql security invoker set search_path = '' as $$
  update public.avisos_email_envios e
  set estado='enviando',intentos=e.intentos+1,ultimo_intento_en=now(),primer_intento_en=coalesce(e.primer_intento_en,now())
  where (e.aviso_id,e.usuaria_id) in (
    select j.aviso_id,j.usuaria_id from public.avisos_email_envios j
    where j.aviso_id=p_aviso_id and j.intentos<4
      and (j.primer_intento_en is null or j.primer_intento_en>now()-interval '23 hours')
      and (j.estado in ('pendiente','error') or (j.estado='enviando' and j.ultimo_intento_en<now()-interval '5 minutes'))
    order by j.creada_en,j.usuaria_id limit 20 for update skip locked
  ) returning e.*;
$$;
revoke all on function public.tomar_emails_aviso(uuid) from public,anon,authenticated;
grant execute on function public.tomar_emails_aviso(uuid) to service_role;
