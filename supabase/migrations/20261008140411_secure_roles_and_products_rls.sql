-- Primera capa de seguridad para perfiles, roles y catálogo.
-- Aplicada al proyecto Supabase exclusivo de la app el 08/10/2026.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles
    where id = (select auth.uid())
      and rol = 'admin'
  );
$$;

revoke all on function public.es_admin() from public, anon;
-- Las políticas existentes consultan esta función durante algunas lecturas públicas.
-- Devuelve únicamente si el usuario actual es admin (para anon siempre false).
grant execute on function public.es_admin() to anon, authenticated, service_role;

create or replace function public.proteger_campos_sensibles_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or public.es_admin() then
    return new;
  end if;

  if new.rol is distinct from old.rol
     or new.plan is distinct from old.plan
     or new.estado is distinct from old.estado
     or new.progreso is distinct from old.progreso
     or new.ventas_total is distinct from old.ventas_total
     or new.comisiones_total is distinct from old.comisiones_total
     or new.modulos_completados is distinct from old.modulos_completados
     or new.racha_dias is distinct from old.racha_dias
     or new.racha_maxima is distinct from old.racha_maxima
     or new.referido_por is distinct from old.referido_por then
    raise exception 'No tenés permiso para modificar campos administrativos';
  end if;

  return new;
end;
$$;

revoke all on function public.proteger_campos_sensibles_perfil() from public, anon, authenticated;

drop trigger if exists proteger_campos_sensibles_perfil on public.perfiles;
create trigger proteger_campos_sensibles_perfil
before update on public.perfiles
for each row execute function public.proteger_campos_sensibles_perfil();

drop policy if exists "Actualizar propio perfil" on public.perfiles;
create policy "Actualizar propio perfil"
on public.perfiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Admin actualiza perfiles" on public.perfiles;
create policy "Admin actualiza perfiles"
on public.perfiles
for update
to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

alter table public.productos enable row level security;
revoke all on table public.productos from anon, authenticated;
grant select on table public.productos to anon, authenticated;
grant insert, update, delete on table public.productos to authenticated;

drop policy if exists "Ver productos activos" on public.productos;
drop policy if exists "Admin ve todos los productos" on public.productos;
create policy "Ver productos activos"
on public.productos
for select
to anon, authenticated
using (activo = true or (select public.es_admin()));

drop policy if exists "Admin gestiona productos" on public.productos;
create policy "Admin gestiona productos"
on public.productos
for all
to authenticated
using ((select public.es_admin()))
with check ((select public.es_admin()));

drop policy if exists "Admin sube imagenes productos" on storage.objects;
create policy "Admin sube imagenes productos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'productos' and (select public.es_admin()));

drop policy if exists "Admin actualiza imagenes productos" on storage.objects;
create policy "Admin actualiza imagenes productos"
on storage.objects
for update
to authenticated
using (bucket_id = 'productos' and (select public.es_admin()))
with check (bucket_id = 'productos' and (select public.es_admin()));
