-- Tempo de viagem de carro de cada origem (núcleo) até cada estalagem.
-- Calculado uma vez no servidor (Google Routes API, matriz de rotas) e guardado,
-- para não gastar a cota gratuita. Recalcula se a origem ou o endereço mudar.

create table public.travel_times (
  household_id uuid not null references public.households (id) on delete cascade,
  accommodation_id uuid not null references public.accommodations (id) on delete cascade,
  -- coordenadas usadas no cálculo (se mudarem, o tempo é recalculado)
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  -- null quando não há rota de carro
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  distance_meters integer check (distance_meters is null or distance_meters >= 0),
  computed_at timestamptz not null default now(),
  primary key (household_id, accommodation_id)
);

alter table public.travel_times enable row level security;
revoke all on public.travel_times from anon, authenticated;
grant select on public.travel_times to authenticated;

-- Membros aprovados leem; só o servidor (service role) grava.
create policy travel_times_select on public.travel_times for select to authenticated
  using ((select public.is_approved()));
