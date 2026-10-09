create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  autora_id uuid not null references auth.users(id),
  titulo text not null check (char_length(titulo) between 1 and 120),
  mensaje text not null check (char_length(mensaje) between 1 and 4000),
  destino text check (destino in ('/inicio','/perfil','/clases','/lanzamiento','/notificaciones')),
  audiencias text[] not null check (cardinality(audiencias) between 1 and 3 and audiencias <@ array['gratuito','desafio','socia']::text[] and array_position(audiencias, null) is null),
  publicado boolean not null default false,
  archivado boolean not null default false,
  push_started_at timestamptz,
  push_completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index avisos_fecha_idx on public.avisos(created_at desc) where publicado and not archivado;
alter table public.avisos enable row level security;
revoke all on public.avisos from anon;
grant select, insert, update on public.avisos to authenticated;
grant all on public.avisos to service_role;

create policy "Administradoras gestionan avisos" on public.avisos for all to authenticated
using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "Usuarias leen avisos de su acceso" on public.avisos for select to authenticated
using (publicado and not archivado and exists (
  select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol <> 'admin'
  and (case when p.tipo_usuario = 'socia' or p.rol in ('afiliada','afiliada_lanzamiento') then 'socia'
    when p.tipo_usuario = 'desafio' then 'desafio' else 'gratuito' end) = any(audiencias)
  and (coalesce(p.tipo_usuario, 'gratuito') <> 'desafio' or p.desafio_socias_habilitada or p.rol in ('afiliada','afiliada_lanzamiento'))
));

create table public.avisos_lecturas (
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  usuaria_id uuid not null references auth.users(id) on delete cascade,
  leido_at timestamptz not null default now(),
  primary key(aviso_id, usuaria_id)
);
create index avisos_lecturas_usuaria_idx on public.avisos_lecturas(usuaria_id);
alter table public.avisos_lecturas enable row level security;
revoke all on public.avisos_lecturas from anon;
grant select, insert, update on public.avisos_lecturas to authenticated;
grant all on public.avisos_lecturas to service_role;
create policy "Cada usuaria lee sus lecturas" on public.avisos_lecturas for select to authenticated
using (usuaria_id = (select auth.uid()));
create policy "Cada usuaria marca sus avisos" on public.avisos_lecturas for insert to authenticated
with check (usuaria_id = (select auth.uid()) and exists (select 1 from public.avisos a where a.id = aviso_id));
create policy "Cada usuaria actualiza sus lecturas" on public.avisos_lecturas for update to authenticated
using (usuaria_id = (select auth.uid()))
with check (usuaria_id = (select auth.uid()) and exists (select 1 from public.avisos a where a.id = aviso_id));

-- Bloqueo temporal real, no solo visual: conserva datos y políticas previas.
-- No afecta perfiles, clases, progreso ni metricas_lanzamiento del Desafío.
do $$
declare tabla text;
begin
  foreach tabla in array array['productos','links_afiliadas','resultados','reacciones','metricas','checklist_tareas','insignias','insignias_alumnas','ventas_afiliadas','publicaciones','comentarios'] loop
    execute format('alter table public.%I enable row level security', tabla);
    execute format('create policy "Modulos Socias en preparacion" on public.%I as restrictive for all to anon, authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', tabla);
  end loop;
end $$;
