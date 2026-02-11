create extension if not exists pgcrypto;

create table if not exists public.roast_generations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_email text,
  url text not null,
  roast text not null,
  roast_mode text check (roast_mode in ('content', 'design')),
  persona_used text check (persona_used in ('assassin', 'kitchen', 'courtroom', 'sports')),
  metrics_source text check (metrics_source in ('pagespeed', 'cached', 'estimated', 'firecrawl')),
  quality_score int check (quality_score between 0 and 100),
  severity_score int check (severity_score between 0 and 100),
  roast_score int check (roast_score between 0 and 100),
  metrics jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  fixes jsonb not null default '[]'::jsonb,
  screenshot_available boolean not null default false,
  screenshot_data text,
  screenshot_capture_error text,
  user_status text check (user_status in ('free', 'waitlist', 'pro')),
  daily_limit int,
  used_today int,
  remaining int,
  groq_calls int not null default 0,
  firecrawl_calls int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_roast_generations_user_created
  on public.roast_generations (user_id, created_at desc);

create index if not exists idx_roast_generations_created
  on public.roast_generations (created_at desc);

create index if not exists idx_roast_generations_url
  on public.roast_generations (url);

alter table public.roast_generations enable row level security;

revoke all on public.roast_generations from anon, authenticated;
