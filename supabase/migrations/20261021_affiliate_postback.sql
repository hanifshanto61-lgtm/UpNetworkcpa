-- Affiliate-owned outbound postback settings.
-- Existing Datify and Smart Link tables are untouched.

create table if not exists public.affiliate_postback_settings (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tracker text not null default 'other',
  postback_url text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_postback_name_length
    check (char_length(name) between 1 and 100),
  constraint affiliate_postback_tracker_length
    check (char_length(tracker) between 1 and 50),
  constraint affiliate_postback_url_length
    check (char_length(postback_url) between 8 and 2000)
);

create index if not exists
  affiliate_postback_settings_owner_idx
on public.affiliate_postback_settings (affiliate_user_id);

create table if not exists public.affiliate_postback_logs (
  id uuid primary key default gen_random_uuid(),
  setting_id uuid references public.affiliate_postback_settings(id)
    on delete set null,
  affiliate_user_id uuid not null references auth.users(id)
    on delete cascade,
  event_type text not null default 'test',
  status text not null default 'pending',
  http_status integer,
  response_excerpt text,
  created_at timestamptz not null default now(),
  constraint affiliate_postback_log_event
    check (event_type in ('test', 'conversion')),
  constraint affiliate_postback_log_status
    check (status in ('pending', 'success', 'failed'))
);

create index if not exists
  affiliate_postback_logs_owner_created_idx
on public.affiliate_postback_logs
  (affiliate_user_id, created_at desc);

alter table public.affiliate_postback_settings
  enable row level security;

alter table public.affiliate_postback_logs
  enable row level security;

-- The application API uses the service role after verifying the
-- authenticated user's identity. No public or anonymous policies.
revoke all on public.affiliate_postback_settings from anon, authenticated;
revoke all on public.affiliate_postback_logs from anon, authenticated;

grant all on public.affiliate_postback_settings to service_role;
grant all on public.affiliate_postback_logs to service_role;