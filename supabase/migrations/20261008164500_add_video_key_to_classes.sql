-- Claves de objeto privado de R2; nunca se guarda una URL pública del video.
alter table public.clases add column if not exists video_key text;
