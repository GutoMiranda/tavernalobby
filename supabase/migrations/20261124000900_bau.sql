-- Etapa 6: plano de depósitos por núcleo e tempo real do baú.

-- Plano de depósitos: quanto e em que dia do mês o núcleo pretende depositar.
-- O site lembra o núcleo a partir desse dia, enquanto o depósito do mês não for registrado.
create table public.deposit_plans (
  fund_id uuid not null references public.funds (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  day_of_month integer not null check (day_of_month between 1 and 28),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null,
  primary key (fund_id, household_id)
);
alter table public.deposit_plans enable row level security;

grant select, insert (fund_id, household_id, amount_cents, day_of_month, updated_by),
  update (amount_cents, day_of_month, updated_by, updated_at), delete
  on public.deposit_plans to authenticated;
create policy deposit_plans_select on public.deposit_plans for select to authenticated
  using ((select public.is_approved()));
create policy deposit_plans_insert on public.deposit_plans for insert to authenticated
  with check ((select public.is_approved()) and household_id = (select public.my_household_id()));
create policy deposit_plans_update on public.deposit_plans for update to authenticated
  using ((select public.is_approved()) and household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
create policy deposit_plans_delete on public.deposit_plans for delete to authenticated
  using ((select public.is_approved()) and household_id = (select public.my_household_id()));

alter publication supabase_realtime add table
  public.funds,
  public.fund_transactions,
  public.deposit_plans;
alter table public.deposit_plans replica identity full;
