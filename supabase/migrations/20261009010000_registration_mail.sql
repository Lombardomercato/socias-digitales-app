-- Only the server can inspect confirmation status or reserve an email send.
create table if not exists public.registration_mail_limits (
  key_hash text primary key,
  last_sent_at timestamptz not null default now(),
  window_start timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.registration_mail_limits enable row level security;
revoke all on public.registration_mail_limits from public, anon, authenticated;

create or replace function public.reserve_registration_mail(p_email text, p_email_hash text, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_limit public.registration_mail_limits;
  v_user auth.users;
begin
  foreach v_key in array array[p_email_hash, p_ip_hash] loop
    insert into public.registration_mail_limits(key_hash) values(v_key) on conflict do nothing;
    select * into v_limit from public.registration_mail_limits where key_hash = v_key for update;
    if v_limit.attempts > 1 and v_key = p_email_hash and v_limit.last_sent_at > now() - interval '60 seconds' then
      return jsonb_build_object('allowed', false);
    end if;
    if v_limit.window_start > now() - interval '1 hour' and v_limit.attempts >= (case when v_key = p_email_hash then 6 else 30 end) then
      return jsonb_build_object('allowed', false);
    end if;
  end loop;
  update public.registration_mail_limits
    set last_sent_at = now(),
        attempts = case when window_start < now() - interval '1 hour' then 1 else attempts + 1 end,
        window_start = case when window_start < now() - interval '1 hour' then now() else window_start end
    where key_hash in (p_email_hash, p_ip_hash);
  select * into v_user from auth.users where email = lower(trim(p_email)) limit 1;
  return jsonb_build_object('allowed', true, 'exists', v_user.id is not null, 'confirmed', v_user.email_confirmed_at is not null);
end;
$$;
revoke all on function public.reserve_registration_mail(text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_registration_mail(text, text, text) to service_role;
