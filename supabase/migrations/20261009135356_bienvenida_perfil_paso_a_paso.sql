create table public.bienvenida_perfiles (
  usuaria_id uuid primary key references public.perfiles(id) on delete cascade,
  paso integer not null default 0 check (paso between 0 and 10),
  respondidas text[] not null default '{}',
  exenta boolean not null default false,
  completado_at timestamptz,
  actualizado_at timestamptz not null default now()
);
alter table public.bienvenida_perfiles enable row level security;
revoke all on public.bienvenida_perfiles from anon, authenticated;
grant select on public.bienvenida_perfiles to authenticated;
grant all on public.bienvenida_perfiles to service_role;
create policy "Consultar bienvenida propia" on public.bienvenida_perfiles
  for select to authenticated using (usuaria_id = (select auth.uid()) or public.es_admin());

-- No fingir que las alumnas existentes contestaron ni cortar su acceso.
-- Las cuentas nuevas, sin este registro de exención, deben completar la bienvenida.
insert into public.bienvenida_perfiles (usuaria_id, exenta)
  select id, true from public.perfiles;
