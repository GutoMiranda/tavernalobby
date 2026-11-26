-- Taverna O Lobby — schema inicial do MVP (escopo, seção 7).
-- Valores monetários sempre em centavos (integer). Toda tabela tem RLS (ver migração de segurança).

-- ---------------------------------------------------------------------------
-- Configuração interna (lida só por funções security definer)
-- ---------------------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value text not null
);

-- O e-mail do admin não é segredo (está no CLAUDE.md); ele vira o único admin no primeiro login.
insert into public.app_config (key, value) values ('admin_email', 'guto.miranda90@gmail.com');

-- ---------------------------------------------------------------------------
-- Grupo, núcleos e pessoas
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

-- Grupo único.
create unique index groups_singleton on public.groups ((true));
insert into public.groups (name) values ('Taverna O Lobby');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  responsible_person_id uuid,
  origin_text text,
  origin_lat double precision,
  origin_lng double precision,
  origin_place_id text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete restrict,
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 80),
  email text,
  relationship text,
  is_child boolean not null default false,
  is_admin boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.people (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint child_has_no_login check (not (is_child and user_id is not null)),
  constraint admin_has_login check (not is_admin or user_id is not null)
);

-- Admin único.
create unique index people_single_admin on public.people (is_admin) where is_admin;
create index people_household_idx on public.people (household_id);

alter table public.households
  add constraint households_responsible_fk
  foreign key (responsible_person_id) references public.people (id) on delete set null
  deferrable initially deferred;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null
);

insert into public.tags (name, label, description) values
  ('Tesoureiro', 'Guardião do Baú', 'Confirma ou recusa depósitos e registra saídas da caixinha.'),
  ('Despensa', 'Guardião do Armazém', 'Controla os itens do armazém (despensa).');

create table public.person_tags (
  person_id uuid not null references public.people (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  assigned_by uuid references public.people (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (person_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Aventuras (encontros)
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  description text,
  region text,
  phase text not null default 'datas'
    check (phase in ('datas', 'estalagens', 'presenca', 'preparativos', 'concluida', 'cancelada')),
  candidate_start date,
  candidate_end date,
  start_date date,
  end_date date,
  chosen_date_option_id uuid,
  chosen_accommodation_id uuid,
  date_vote_deadline timestamptz,
  accommodation_vote_deadline timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint candidate_period check (candidate_end is null or candidate_start is null or candidate_end >= candidate_start),
  constraint event_period check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.date_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  constraint date_option_period check (end_date >= start_date)
);
create index date_options_event_idx on public.date_options (event_id);

create table public.date_reactions (
  date_option_id uuid not null references public.date_options (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (date_option_id, person_id)
);

create table public.accommodations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  url text,
  address text,
  lat double precision,
  lng double precision,
  place_id text,
  total_price_cents integer not null check (total_price_cents >= 0),
  capacity integer check (capacity is null or capacity > 0),
  photos text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null
);
create index accommodations_event_idx on public.accommodations (event_id);

create table public.accommodation_reactions (
  accommodation_id uuid not null references public.accommodations (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (accommodation_id, person_id)
);

alter table public.events
  add constraint events_chosen_date_fk foreign key (chosen_date_option_id)
    references public.date_options (id) on delete set null,
  add constraint events_chosen_accommodation_fk foreign key (chosen_accommodation_id)
    references public.accommodations (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Presença
-- ---------------------------------------------------------------------------
create table public.attendances (
  event_id uuid not null references public.events (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'vai', 'nao_vai')),
  -- null = período todo; senão, número de dias (mínimo 1; máximo checado na aplicação contra o período).
  days integer check (days is null or days >= 1),
  alcohol_opt_in boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null,
  primary key (event_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Custos
-- ---------------------------------------------------------------------------
create table public.cost_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  category text not null check (category in ('acomodacao', 'alimentacao', 'alcool', 'extra')),
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  -- 'presentes' = todos os adultos presentes; 'opt_in' = só quem aderiu (extras e álcool).
  eligibility text not null default 'presentes' check (eligibility in ('presentes', 'opt_in')),
  proportional_to_days boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null
);
create index cost_items_event_idx on public.cost_items (event_id);

-- Adesão de uma pessoa a um extra com elegibilidade "opt_in".
create table public.cost_item_optins (
  cost_item_id uuid not null references public.cost_items (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  primary key (cost_item_id, person_id)
);

-- Ajuste de peso de uma pessoa num item (padrão 1; ex.: 0,5).
create table public.cost_weights (
  cost_item_id uuid not null references public.cost_items (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  weight numeric(5, 2) not null check (weight >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null,
  primary key (cost_item_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Baú (caixinha)
-- ---------------------------------------------------------------------------
create table public.funds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  bank text,
  holder text,
  pix_key text,
  -- null = meta igual à soma dos custos (calculada).
  goal_cents integer check (goal_cents is null or goal_cents >= 0),
  pix_changed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null
);

create table public.fund_settings_history (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds (id) on delete cascade,
  changed_by uuid references public.people (id) on delete set null,
  changed_at timestamptz not null default now(),
  old_bank text,
  new_bank text,
  old_holder text,
  new_holder text,
  old_pix_key text,
  new_pix_key text
);
create index fund_settings_history_fund_idx on public.fund_settings_history (fund_id, changed_at desc);

create table public.fund_transactions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds (id) on delete restrict,
  kind text not null check (kind in ('entrada', 'saida', 'estorno')),
  household_id uuid references public.households (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  occurred_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  description text,
  receipt_path text,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'recusado')),
  reverses_id uuid references public.fund_transactions (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.people (id) on delete set null,
  review_note text,
  constraint estorno_has_target check ((kind = 'estorno') = (reverses_id is not null)),
  constraint entrada_has_household check (kind <> 'entrada' or household_id is not null)
);
create index fund_transactions_fund_idx on public.fund_transactions (fund_id, created_at desc);
-- Um lançamento só pode ser estornado uma vez.
create unique index fund_transactions_single_reversal on public.fund_transactions (reverses_id)
  where reverses_id is not null;

-- ---------------------------------------------------------------------------
-- Armazém (despensa)
-- ---------------------------------------------------------------------------
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text,
  -- quantidade por pessoa (adulto ou criança); a sugestão total é calculada.
  quantity_per_person numeric(10, 2),
  quantity numeric(10, 2),
  unit text,
  is_alcoholic boolean not null default false,
  responsible_person_id uuid references public.people (id) on delete set null,
  purchased boolean not null default false,
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null
);
create index pantry_items_event_idx on public.pantry_items (event_id);

-- ---------------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_person_id uuid not null references public.people (id) on delete cascade,
  kind text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_person_id, created_at desc);
