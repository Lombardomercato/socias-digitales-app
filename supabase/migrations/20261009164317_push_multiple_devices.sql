-- A shared browser must receive notices for its most recently registered account only.
-- Retire duplicate device registrations, never accounts or student records.
with duplicados as (
  select id, row_number() over (partition by endpoint order by creado_en desc, id desc) as orden
  from public.push_subscriptions
)
delete from public.push_subscriptions where id in (select id from duplicados where orden > 1);

-- Preserve distinct devices; allow several devices per account.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_alumna_id_key;
alter table public.push_subscriptions add constraint push_subscriptions_alumna_endpoint_key unique (alumna_id, endpoint);
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key unique (endpoint);
alter table public.push_subscriptions add column ultima_prueba_at timestamptz;
alter table public.push_subscriptions enable row level security;
