alter table public.clases add column acceso_gratuito boolean not null default false;
-- Solo las tres clases introductorias elegidas; nuevas clases siguen privadas.
update public.clases set acceso_gratuito=true where id in (
'2d0df184-c4a0-4072-bf9e-80734b876b35',
'960f666f-c538-4556-880c-1832564257fb',
'2a0be75c-7e3c-46a7-af37-936dd86bbbb9'
);
create policy "Ver muestras gratuitas y clases Socias" on public.clases
for select to authenticated using (
activo and exists (select 1 from public.perfiles p where p.id=(select auth.uid()) and
(acceso_gratuito or p.tipo_usuario='socia'))
);
-- Las escrituras siguen limitadas por la política administrativa existente.
