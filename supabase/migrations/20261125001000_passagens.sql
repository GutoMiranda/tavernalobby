-- Fase 5: preços de passagens (ônibus e avião) que o grupo encontrou. O site não vende nem reserva:
-- mostra links de busca e guarda o que cada um achou, para comparar.

create table public.ticket_prices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  mode text not null check (mode in ('onibus', 'aviao')),
  origin text not null check (length(trim(origin)) between 1 and 120),
  destination text not null check (length(trim(destination)) between 1 and 120),
  travel_date date,
  return_date date,
  -- Preço por pessoa, ida e volta quando houver volta, em centavos.
  price_cents integer not null check (price_cents > 0 and price_cents <= 10000000),
  link text check (link is null or (link ~ '^https://' and length(link) <= 500)),
  notes text check (notes is null or length(notes) <= 300),
  created_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ticket_prices_periodo check (return_date is null or travel_date is null or return_date >= travel_date)
);
create index ticket_prices_event_idx on public.ticket_prices (event_id, price_cents);

alter table public.ticket_prices enable row level security;
revoke all on public.ticket_prices from anon, authenticated;
grant select, insert (event_id, household_id, mode, origin, destination, travel_date, return_date, price_cents, link, notes, created_by),
  delete on public.ticket_prices to authenticated;

create policy ticket_prices_select on public.ticket_prices for select to authenticated
  using ((select public.is_approved()));
create policy ticket_prices_insert on public.ticket_prices for insert to authenticated
  with check (
    (select public.is_approved())
    and household_id = (select public.my_household_id())
    and created_by = (select public.current_person_id())
  );
-- Remove quem registrou ou quem pode excluir na aba Aventura.
create policy ticket_prices_delete on public.ticket_prices for delete to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.pode('aventura', 'excluir')))
  );

alter publication supabase_realtime add table public.ticket_prices;
