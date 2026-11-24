-- Ponto de encontro da aventura: o lugar onde a party se reúne antes de seguir para a estalagem.
alter table public.events
  add column meeting_name text,
  add column meeting_address text,
  add column meeting_lat double precision,
  add column meeting_lng double precision,
  add column meeting_place_id text,
  add column meeting_at timestamptz,
  add column meeting_notes text;
