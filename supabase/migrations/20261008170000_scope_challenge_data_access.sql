-- Las tablas de avance solo reflejan datos del Desafío para alumnas habilitadas.
drop policy if exists "alumna gestiona sus metricas" on public.metricas_lanzamiento;
create policy "habilitada gestiona sus metricas"
on public.metricas_lanzamiento
for all
to authenticated
using (
  alumna_id = (select auth.uid())
  and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.desafio_socias_habilitada = true
  )
)
with check (
  alumna_id = (select auth.uid())
  and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.desafio_socias_habilitada = true
  )
);

drop policy if exists "Ver propio progreso" on public.progreso_lecciones;
drop policy if exists "Guardar propio progreso" on public.progreso_lecciones;
drop policy if exists "Actualizar propio progreso" on public.progreso_lecciones;

create policy "Ver progreso propio del desafio"
on public.progreso_lecciones
for select
to authenticated
using (
  (alumna_id = (select auth.uid()) and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.desafio_socias_habilitada = true
  ))
  or (select public.es_admin())
);

create policy "Guardar progreso propio del desafio"
on public.progreso_lecciones
for insert
to authenticated
with check (
  alumna_id = (select auth.uid())
  and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.desafio_socias_habilitada = true
  )
);

create policy "Actualizar progreso propio del desafio"
on public.progreso_lecciones
for update
to authenticated
using (
  alumna_id = (select auth.uid())
  and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.desafio_socias_habilitada = true
  )
)
with check (
  alumna_id = (select auth.uid())
  and exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.desafio_socias_habilitada = true
  )
);
