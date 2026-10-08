-- Habilitación explícita por Flor para el primer acceso al Desafío Socias.
alter table public.perfiles
  add column if not exists desafio_socias_habilitada boolean not null default false,
  add column if not exists desafio_socias_habilitada_at timestamptz,
  add column if not exists desafio_socias_habilitada_por uuid references auth.users(id) on delete set null,
  add column if not exists desafio_socias_bienvenida_enviada_at timestamptz;

create or replace function public.proteger_habilitacion_desafio_socias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not (select public.es_admin())
     and (
       new.desafio_socias_habilitada is distinct from old.desafio_socias_habilitada
       or new.desafio_socias_habilitada_at is distinct from old.desafio_socias_habilitada_at
       or new.desafio_socias_habilitada_por is distinct from old.desafio_socias_habilitada_por
       or new.desafio_socias_bienvenida_enviada_at is distinct from old.desafio_socias_bienvenida_enviada_at
     ) then
    raise exception 'Solo una administradora puede cambiar el acceso al Desafío Socias';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_habilitacion_desafio_socias on public.perfiles;
create trigger proteger_habilitacion_desafio_socias
before update on public.perfiles
for each row execute function public.proteger_habilitacion_desafio_socias();

-- La asistencia a este desafío, y no la asignación histórica de planes, da acceso a las clases.
drop policy if exists "Ver clases del plan" on public.clases;
create policy "Ver clases del desafio habilitado"
on public.clases
for select
to authenticated
using (
  activo = true
  and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid())
      and (p.desafio_socias_habilitada = true or p.rol = 'admin')
  )
);

drop policy if exists "Ver modulos del programa" on public.modulos;
create policy "Ver modulos del desafio habilitado"
on public.modulos
for select
to authenticated
using (
  (estado = 'publicado' and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid())
      and p.desafio_socias_habilitada = true
  ))
  or (select public.es_admin())
);
drop policy if exists "Ver lecciones del programa" on public.lecciones;
create policy "Ver lecciones del desafio habilitado"
on public.lecciones
for select
to authenticated
using (
  exists (
    select 1 from public.modulos m
    where m.id = lecciones.modulo_id
      and m.estado = 'publicado'
      and exists (
        select 1 from public.perfiles p
        where p.id = (select auth.uid())
          and p.desafio_socias_habilitada = true
      )
  )
  or (select public.es_admin())
);
