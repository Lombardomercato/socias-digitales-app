-- Activar después de publicar /api/resultados/[id]/archivo.
-- Conserva las capturas y sus claves anteriores; no elimina archivos.
update storage.buckets set public=false where id='resultados';
