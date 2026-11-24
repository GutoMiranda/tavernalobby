-- Etapa 3: convite do grupo e convite para um adulto dependente assumir o próprio perfil.

-- ---------------------------------------------------------------------------
-- Convite do grupo
-- ---------------------------------------------------------------------------

-- Confere se um código de convite é válido (a página de convite é aberta antes do login).
create or replace function public.check_invite_code(p_code text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.groups where invite_code = p_code);
$$;

-- Gera um novo código de convite (o link antigo deixa de funcionar). Só admin.
create or replace function public.regenerate_invite_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  if not public.is_admin() then
    perform public.raise_forbidden('Só o Mestre da Taverna (admin) gera um novo convite.');
  end if;
  update public.groups set invite_code = v_code;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Adulto dependente assume o próprio perfil
-- ---------------------------------------------------------------------------
-- Tokens de convite ficam numa tabela à parte, sem acesso direto (só pelas funções abaixo).
create table public.claim_invites (
  person_id uuid primary key references public.people (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  created_by uuid references public.people (id) on delete set null
);
alter table public.claim_invites enable row level security;
revoke all on public.claim_invites from anon, authenticated;

-- Gera (ou renova) o convite para um adulto dependente do meu núcleo. Vale 14 dias.
create or replace function public.create_claim_invite(p_person_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_token uuid := gen_random_uuid();
begin
  if not public.is_approved() then
    perform public.raise_forbidden('Só membros aprovados convidam.');
  end if;

  if not exists (
    select 1 from public.people
    where id = p_person_id
      and household_id = public.my_household_id()
      and user_id is null
      and not is_child
  ) then
    raise exception 'Só um adulto dependente do seu núcleo pode receber este convite.' using errcode = '22023';
  end if;

  insert into public.claim_invites (person_id, token, expires_at, created_by)
  values (p_person_id, v_token, now() + interval '14 days', public.current_person_id())
  on conflict (person_id) do update
    set token = excluded.token, expires_at = excluded.expires_at,
        created_at = now(), created_by = excluded.created_by;
  return v_token;
end;
$$;

-- Mostra para quem abriu o link de quem é o perfil (antes de aceitar).
create or replace function public.get_claim_invite(p_token uuid)
returns table (person_name text, household_name text)
language sql stable security definer set search_path = ''
as $$
  select p.name, h.name
  from public.claim_invites c
  join public.people p on p.id = c.person_id
  join public.households h on h.id = p.household_id
  where c.token = p_token
    and c.expires_at > now()
    and p.user_id is null;
$$;

-- Quem acabou de entrar assume o perfil do dependente, mantendo o histórico dele.
-- O núcleo e a pessoa criados automaticamente no primeiro login são descartados.
create or replace function public.claim_dependent_profile(p_token uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_target public.people;
  v_email text;
begin
  if v_uid is null then
    perform public.raise_forbidden('Entre na sua conta para aceitar o convite.');
  end if;

  select p.* into v_target
  from public.claim_invites c
  join public.people p on p.id = c.person_id
  where c.token = p_token and c.expires_at > now() and p.user_id is null
  for update of p;
  if v_target.id is null then
    raise exception 'Convite inválido ou expirado. Peça um novo convite.' using errcode = 'P0002';
  end if;

  select * into v_me from public.people where user_id = v_uid for update;
  if v_me.id is not null then
    -- Só dá para trocar se a conta for nova: não admin e sozinha no próprio núcleo, sem lançamentos.
    if v_me.is_admin
       or exists (select 1 from public.people where household_id = v_me.household_id and id <> v_me.id)
       or exists (select 1 from public.fund_transactions where household_id = v_me.household_id) then
      raise exception 'Esta conta já tem um núcleo em uso. Entre com outra conta para aceitar o convite.'
        using errcode = '22023';
    end if;
    delete from public.people where id = v_me.id;
    delete from public.households where id = v_me.household_id;
  end if;

  select email into v_email from auth.users where id = v_uid;

  update public.people
  set user_id = v_uid,
      email = v_email,
      status = 'approved'
  where id = v_target.id;

  delete from public.claim_invites where person_id = v_target.id;

  return v_target.id;
end;
$$;

revoke execute on function
  public.check_invite_code(text),
  public.regenerate_invite_code(),
  public.create_claim_invite(uuid),
  public.get_claim_invite(uuid),
  public.claim_dependent_profile(uuid)
from public, anon, authenticated;

grant execute on function public.check_invite_code(text) to anon, authenticated;
grant execute on function
  public.regenerate_invite_code(),
  public.create_claim_invite(uuid),
  public.get_claim_invite(uuid),
  public.claim_dependent_profile(uuid)
to authenticated;
