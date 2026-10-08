-- Tres tipos operativos de cuenta. El acceso efectivo al Desafío sigue
-- dependiendo de la habilitación explícita de una administradora.
alter table public.perfiles
  add column if not exists tipo_usuario text not null default 'gratuito',
  add column if not exists desafio_socias_estado text not null default 'no_aplica';

update public.perfiles
set tipo_usuario = case
  when rol in ('afiliada', 'afiliada_lanzamiento') then 'socia'
  when rol = 'alumna' or coalesce(desafio_socias_habilitada, false) then 'desafio'
  else 'gratuito'
end;

alter table public.perfiles
  drop constraint if exists perfiles_tipo_usuario_check;

alter table public.perfiles
  add constraint perfiles_tipo_usuario_check
  check (tipo_usuario in ('gratuito', 'desafio', 'socia'));

update public.perfiles
set desafio_socias_estado = case
  when tipo_usuario = 'desafio' and coalesce(desafio_socias_habilitada, false) then 'habilitada'
  when tipo_usuario = 'desafio' then 'pendiente'
  else 'no_aplica'
end;

alter table public.perfiles
  drop constraint if exists perfiles_desafio_socias_estado_check;

alter table public.perfiles
  add constraint perfiles_desafio_socias_estado_check
  check (desafio_socias_estado in ('no_aplica', 'pendiente', 'habilitada', 'rechazada', 'bloqueada'));

-- El tipo viene de metadata controlada por la app; nadie puede autoasignarse Socia.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
begin
  v_tipo := case
    when new.raw_user_meta_data->>'tipo_usuario' = 'desafio' then 'desafio'
    else 'gratuito'
  end;

  insert into public.perfiles (id, nombre, tipo_usuario, rol, desafio_socias_habilitada, desafio_socias_estado)
  values (new.id, new.raw_user_meta_data->>'nombre', v_tipo, 'alumna', false,
    case when v_tipo = 'desafio' then 'pendiente' else 'no_aplica' end);
  return new;
end;
$$;

-- Los cambios de categoría quedan reservados a servicio/admin.
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
     or new.tipo_usuario is distinct from old.tipo_usuario
     or new.desafio_socias_estado is distinct from old.desafio_socias_estado
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
