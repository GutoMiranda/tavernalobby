-- Vários pontos de encontro por aventura e famílias de teste para simular custos.

-- ---------------------------------------------------------------------------
-- Pontos de encontro: cada grupo que vem junto pode ter o seu.
-- Os campos meeting_* de events ficam como estavam (não são mais lidos pelo site).
-- ---------------------------------------------------------------------------
create table public.meeting_points (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text check (name is null or length(trim(name)) between 1 and 120),
  address text check (address is null or length(address) <= 300),
  lat double precision,
  lng double precision,
  place_id text check (place_id is null or length(place_id) <= 300),
  meet_at timestamptz,
  notes text check (notes is null or length(notes) <= 1000),
  created_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint meeting_points_tem_lugar check (name is not null or address is not null)
);
create index meeting_points_event_idx on public.meeting_points (event_id, created_at);

-- Traz o ponto de encontro que já existia.
insert into public.meeting_points (event_id, name, address, lat, lng, place_id, meet_at, notes, created_at)
select id, meeting_name, meeting_address, meeting_lat, meeting_lng, meeting_place_id, meeting_at, meeting_notes, now()
from public.events
where meeting_name is not null or meeting_address is not null;

alter table public.meeting_points enable row level security;
revoke all on public.meeting_points from anon, authenticated;
grant select, insert (event_id, name, address, lat, lng, place_id, meet_at, notes, created_by),
  update (name, address, lat, lng, place_id, meet_at, notes), delete
  on public.meeting_points to authenticated;

-- Todo membro vê e cadastra; quem cadastrou ou quem edita a Aventura altera; quem cadastrou ou quem exclui na Aventura remove.
create policy meeting_points_select on public.meeting_points for select to authenticated
  using ((select public.is_approved()));
create policy meeting_points_insert on public.meeting_points for insert to authenticated
  with check ((select public.is_approved()) and created_by = (select public.current_person_id()));
create policy meeting_points_update on public.meeting_points for update to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.pode('aventura', 'editar')))
  );
create policy meeting_points_delete on public.meeting_points for delete to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.pode('aventura', 'excluir')))
  );

alter publication supabase_realtime add table public.meeting_points;

-- ---------------------------------------------------------------------------
-- Famílias de teste: núcleos sem login, só para simular presença, custos e Baú.
-- ---------------------------------------------------------------------------
alter table public.households add column is_test boolean not null default false;

create or replace function public.create_test_household(p_name text, p_adults integer, p_children integer)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_nome text := '[Teste] ' || coalesce(nullif(trim(p_name), ''), 'Família');
begin
  if not public.pode('membros', 'editar') then
    perform public.raise_forbidden('Só o Mestre da Taverna ou quem edita Membros cria famílias de teste.');
  end if;
  if p_adults is null or p_adults < 1 or p_adults > 10 or p_children is null or p_children < 0 or p_children > 10 then
    raise exception 'Use de 1 a 10 adultos e de 0 a 10 crianças.' using errcode = '22023';
  end if;

  insert into public.households (name, is_test, created_by)
  values (left(v_nome, 80), true, auth.uid())
  returning id into v_id;

  insert into public.people (household_id, name, is_child, created_by)
  select v_id, 'Adulto ' || g || ' (teste)', false, auth.uid() from generate_series(1, p_adults) g;
  insert into public.people (household_id, name, is_child, created_by)
  select v_id, 'Criança ' || g || ' (teste)', true, auth.uid() from generate_series(1, p_children) g;

  update public.households
  set responsible_person_id = (select id from public.people where household_id = v_id and not is_child order by name limit 1)
  where id = v_id;
  return v_id;
end;
$$;

-- Apaga a família de teste e tudo o que foi lançado para ela. Exceção à regra de não apagar dinheiro:
-- vale só para núcleos marcados como teste, que nunca representam dinheiro de verdade.
create or replace function public.delete_test_household(p_household_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.pode('membros', 'excluir') then
    perform public.raise_forbidden('Só o Mestre da Taverna ou quem exclui em Membros apaga famílias de teste.');
  end if;
  if not exists (select 1 from public.households where id = p_household_id and is_test) then
    raise exception 'Família de teste não encontrada.' using errcode = 'P0002';
  end if;

  delete from public.pix_checkouts where household_id = p_household_id;
  delete from public.fund_transactions
  where reverses_id in (select id from public.fund_transactions where household_id = p_household_id);
  delete from public.fund_transactions where household_id = p_household_id;
  update public.households set responsible_person_id = null where id = p_household_id;
  delete from public.people where household_id = p_household_id;
  delete from public.households where id = p_household_id;
end;
$$;

revoke execute on function
  public.create_test_household(text, integer, integer),
  public.delete_test_household(uuid)
from public, anon;
grant execute on function
  public.create_test_household(text, integer, integer),
  public.delete_test_household(uuid)
to authenticated;
