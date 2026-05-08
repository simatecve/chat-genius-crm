-- Tabla de asistentes de VAPI creados desde el CRM
create table if not exists vapi_assistants (
  id uuid primary key default gen_random_uuid(),
  vapi_assistant_id text unique not null,
  name text not null,
  first_message text,
  voice_provider text,
  voice_id text,
  model_provider text,
  model_name text,
  system_prompt text,
  created_at timestamptz default now()
);

alter table vapi_assistants enable row level security;

create policy "Users can read assistants"
  on vapi_assistants for select using (true);

create policy "Authenticated users can insert assistants"
  on vapi_assistants for insert with check (auth.role() = 'authenticated');

-- Tabla de números de teléfono sincronizados desde VAPI
create table if not exists vapi_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  vapi_phone_number_id text unique not null,
  friendly_name text,
  phone_number text,
  created_at timestamptz default now()
);

alter table vapi_phone_numbers enable row level security;

create policy "Users can read phone numbers"
  on vapi_phone_numbers for select using (true);

-- Tabla de llamadas iniciadas con VAPI
create table if not exists vapi_calls (
  id uuid primary key default gen_random_uuid(),
  vapi_call_id text unique,
  campaign_id uuid references ia_calls(id) on delete set null,
  assistant_id text,
  phone_number_id text,
  destination text not null,
  status text default 'queued',
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  transcript text,
  summary text,
  recording_url text,
  ended_reason text,
  intent jsonb,
  raw_event jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vapi_calls_vapi_call_id on vapi_calls(vapi_call_id);
create index if not exists idx_vapi_calls_status on vapi_calls(status);
create index if not exists idx_vapi_calls_campaign_id on vapi_calls(campaign_id);

alter table vapi_calls enable row level security;

create policy "Users can read their calls"
  on vapi_calls for select using (true);
