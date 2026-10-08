-- PostgREST provides JWT claims as JSON. Use auth.role(), not the old
-- request.jwt.claim.role setting, so legitimate server approvals work.
create or replace function public.proteger_campos_sensibles_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'service_role' or (select public.es_admin()) then return new; end if;
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
