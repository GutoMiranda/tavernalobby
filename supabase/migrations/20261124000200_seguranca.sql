-- Taverna O Lobby — segurança: funções auxiliares, RLS, permissões e funções security definer.
--
-- Modelo:
--   * Não aprovado: só lê a própria linha em people.
--   * Aprovado: lê os dados do grupo; escreve o que é seu (reações, presença do núcleo, depósitos...).
--   * Admin (Mestre da Taverna): cria aventuras, custos, regras, aprova membros, atribui tags, altera banco/Pix.
--   * Tag Tesoureiro (Guardião do Baú): confirma/recusa depósitos, registra saídas e estornos. Não altera Pix.
-- Ações sensíveis passam por funções security definer, que checam o papel e gravam quem fez.

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer para não cair em recursão de RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_person_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.people p where p.user_id = (select auth.uid());
$$;

create or replace function public.my_household_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.household_id from public.people p where p.user_id = (select auth.uid());
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.people p
    where p.user_id = (select auth.uid()) and p.status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.people p
    where p.user_id = (select auth.uid()) and p.status = 'approved' and p.is_admin
  );
$$;

create or replace function public.has_tag(tag_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.people p
    join public.person_tags pt on pt.person_id = p.id
    join public.tags t on t.id = pt.tag_id
    where p.user_id = (select auth.uid()) and p.status = 'approved' and t.name = tag_name
  );
$$;

-- Pessoa pertence ao núcleo de quem está logado (para presença e opções por todos do núcleo).
create or replace function public.in_my_household(target_person_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.people p
    where p.id = target_person_id and p.household_id = public.my_household_id()
  );
$$;

-- Erro padrão de permissão (mensagem direta, em português).
create or replace function public.raise_forbidden(msg text)
returns void
language plpgsql set search_path = ''
as $$
begin
  raise exception '%', msg using errcode = '42501';
end;
$$;

-- Notificação para todos os membros aprovados com login (uso interno).
create or replace function public.notify_all_members(p_kind text, p_message text, p_link text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (recipient_person_id, kind, message, link)
  select p.id, p_kind, p_message, p_link
  from public.people p
  where p.user_id is not null and p.status = 'approved';
$$;

-- ---------------------------------------------------------------------------
-- Novo login: cria núcleo e pessoa; o e-mail do admin vira admin aprovado
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_admin_email text;
  v_is_admin boolean;
  v_household_id uuid;
  v_person_id uuid;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1),
    'Aventureiro'
  );
  v_name := left(v_name, 80);

  select value into v_admin_email from public.app_config where key = 'admin_email';
  v_is_admin := new.email is not null
    and lower(new.email) = lower(v_admin_email)
    and not exists (select 1 from public.people where is_admin);

  insert into public.households (name, created_by)
  values ('Família de ' || split_part(v_name, ' ', 1), new.id)
  returning id into v_household_id;

  insert into public.people (household_id, user_id, name, email, is_admin, status, approved_at, created_by)
  values (
    v_household_id, new.id, v_name, new.email, v_is_admin,
    case when v_is_admin then 'approved' else 'pending' end,
    case when v_is_admin then now() else null end,
    new.id
  )
  returning id into v_person_id;

  update public.households set responsible_person_id = v_person_id where id = v_household_id;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dependente (sem login) já nasce aprovado: quem o cadastra é um membro aprovado do núcleo.
create or replace function public.people_before_insert()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.user_id is null then
    new.status := 'approved';
    new.is_admin := false;
  end if;
  return new;
end;
$$;

create trigger people_before_insert
  before insert on public.people
  for each row execute function public.people_before_insert();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
create trigger attendances_touch before update on public.attendances
  for each row execute function public.touch_updated_at();
create trigger cost_items_touch before update on public.cost_items
  for each row execute function public.touch_updated_at();
create trigger cost_weights_touch before update on public.cost_weights
  for each row execute function public.touch_updated_at();
create trigger funds_touch before update on public.funds
  for each row execute function public.touch_updated_at();
create trigger pantry_items_touch before update on public.pantry_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.app_config enable row level security;
alter table public.groups enable row level security;
alter table public.households enable row level security;
alter table public.people enable row level security;
alter table public.tags enable row level security;
alter table public.person_tags enable row level security;
alter table public.events enable row level security;
alter table public.date_options enable row level security;
alter table public.date_reactions enable row level security;
alter table public.accommodations enable row level security;
alter table public.accommodation_reactions enable row level security;
alter table public.attendances enable row level security;
alter table public.cost_items enable row level security;
alter table public.cost_item_optins enable row level security;
alter table public.cost_weights enable row level security;
alter table public.funds enable row level security;
alter table public.fund_settings_history enable row level security;
alter table public.fund_transactions enable row level security;
alter table public.pantry_items enable row level security;
alter table public.notifications enable row level security;

-- Permissões de tabela: o Supabase dá tudo para anon/authenticated por padrão; aqui
-- tiramos tudo e devolvemos só o necessário (inclusive por coluna). O RLS filtra as linhas.
revoke all on all tables in schema public from anon, authenticated;

-- app_config: ninguém acessa direto (só funções security definer).

-- groups
grant select, update (name) on public.groups to authenticated;
create policy groups_select on public.groups for select to authenticated
  using ((select public.is_approved()));
create policy groups_update on public.groups for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- households
grant select, update (name, origin_text, origin_lat, origin_lng, origin_place_id)
  on public.households to authenticated;
create policy households_select on public.households for select to authenticated
  using ((select public.is_approved()) or id = (select public.my_household_id()));
create policy households_update on public.households for update to authenticated
  using ((select public.is_approved()) and id = (select public.my_household_id()))
  with check (id = (select public.my_household_id()));

-- people
grant select on public.people to authenticated;
grant insert (household_id, name, relationship, is_child, created_by) on public.people to authenticated;
grant update (name, relationship, is_child) on public.people to authenticated;
grant delete on public.people to authenticated;
create policy people_select on public.people for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_approved()));
create policy people_insert on public.people for insert to authenticated
  with check (
    (select public.is_approved())
    and household_id = (select public.my_household_id())
    and user_id is null
  );
create policy people_update on public.people for update to authenticated
  using ((select public.is_approved()) and household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));
create policy people_delete on public.people for delete to authenticated
  using (
    (select public.is_approved())
    and household_id = (select public.my_household_id())
    and user_id is null
  );

-- tags (admin cria e edita); person_tags só por função
grant select, insert, update, delete on public.tags to authenticated;
create policy tags_select on public.tags for select to authenticated
  using ((select public.is_approved()));
create policy tags_admin_insert on public.tags for insert to authenticated
  with check ((select public.is_admin()));
create policy tags_admin_update on public.tags for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tags_admin_delete on public.tags for delete to authenticated
  using ((select public.is_admin()) and name not in ('Tesoureiro'));

grant select on public.person_tags to authenticated;
create policy person_tags_select on public.person_tags for select to authenticated
  using ((select public.is_approved()));

-- events: leitura para aprovados, escrita só admin
grant select, insert, update, delete on public.events to authenticated;
create policy events_select on public.events for select to authenticated
  using ((select public.is_approved()));
create policy events_admin_insert on public.events for insert to authenticated
  with check ((select public.is_admin()));
create policy events_admin_update on public.events for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy events_admin_delete on public.events for delete to authenticated
  using ((select public.is_admin()));

-- date_options: admin cadastra
grant select, insert, update, delete on public.date_options to authenticated;
create policy date_options_select on public.date_options for select to authenticated
  using ((select public.is_approved()));
create policy date_options_admin_insert on public.date_options for insert to authenticated
  with check ((select public.is_admin()));
create policy date_options_admin_update on public.date_options for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy date_options_admin_delete on public.date_options for delete to authenticated
  using ((select public.is_admin()));

-- date_reactions: cada adulto com login reage por si
grant select, insert, update (value), delete on public.date_reactions to authenticated;
create policy date_reactions_select on public.date_reactions for select to authenticated
  using ((select public.is_approved()));
create policy date_reactions_insert on public.date_reactions for insert to authenticated
  with check ((select public.is_approved()) and person_id = (select public.current_person_id()));
create policy date_reactions_update on public.date_reactions for update to authenticated
  using (person_id = (select public.current_person_id()))
  with check (person_id = (select public.current_person_id()));
create policy date_reactions_delete on public.date_reactions for delete to authenticated
  using (person_id = (select public.current_person_id()));

-- accommodations: qualquer aprovado cadastra; autor ou admin edita/remove
grant select, insert, update, delete on public.accommodations to authenticated;
create policy accommodations_select on public.accommodations for select to authenticated
  using ((select public.is_approved()));
create policy accommodations_insert on public.accommodations for insert to authenticated
  with check ((select public.is_approved()) and created_by = (select public.current_person_id()));
create policy accommodations_update on public.accommodations for update to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.is_admin()))
  )
  with check ((select public.is_approved()));
create policy accommodations_delete on public.accommodations for delete to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.is_admin()))
  );

grant select, insert, update (value), delete on public.accommodation_reactions to authenticated;
create policy accommodation_reactions_select on public.accommodation_reactions for select to authenticated
  using ((select public.is_approved()));
create policy accommodation_reactions_insert on public.accommodation_reactions for insert to authenticated
  with check ((select public.is_approved()) and person_id = (select public.current_person_id()));
create policy accommodation_reactions_update on public.accommodation_reactions for update to authenticated
  using (person_id = (select public.current_person_id()))
  with check (person_id = (select public.current_person_id()));
create policy accommodation_reactions_delete on public.accommodation_reactions for delete to authenticated
  using (person_id = (select public.current_person_id()));

-- attendances: o responsável/adulto do núcleo confirma por todos do núcleo; admin também
grant select, insert (event_id, person_id, status, days, alcohol_opt_in, updated_by),
  update (status, days, alcohol_opt_in, updated_by) on public.attendances to authenticated;
create policy attendances_select on public.attendances for select to authenticated
  using ((select public.is_approved()));
create policy attendances_insert on public.attendances for insert to authenticated
  with check (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.is_admin()))
  );
create policy attendances_update on public.attendances for update to authenticated
  using (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.is_admin()))
  )
  with check (public.in_my_household(person_id) or (select public.is_admin()));

-- cost_items e cost_weights: só admin escreve
grant select, insert, update, delete on public.cost_items to authenticated;
create policy cost_items_select on public.cost_items for select to authenticated
  using ((select public.is_approved()));
create policy cost_items_admin_insert on public.cost_items for insert to authenticated
  with check ((select public.is_admin()));
create policy cost_items_admin_update on public.cost_items for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cost_items_admin_delete on public.cost_items for delete to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.cost_weights to authenticated;
create policy cost_weights_select on public.cost_weights for select to authenticated
  using ((select public.is_approved()));
create policy cost_weights_admin_insert on public.cost_weights for insert to authenticated
  with check ((select public.is_admin()));
create policy cost_weights_admin_update on public.cost_weights for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cost_weights_admin_delete on public.cost_weights for delete to authenticated
  using ((select public.is_admin()));

-- cost_item_optins: o núcleo marca a adesão aos extras opt-in
grant select, insert (cost_item_id, person_id, created_by), delete on public.cost_item_optins to authenticated;
create policy cost_item_optins_select on public.cost_item_optins for select to authenticated
  using ((select public.is_approved()));
create policy cost_item_optins_insert on public.cost_item_optins for insert to authenticated
  with check (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.is_admin()))
  );
create policy cost_item_optins_delete on public.cost_item_optins for delete to authenticated
  using (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.is_admin()))
  );

-- funds: admin cria e define a meta; banco/Pix só pela função update_fund_banking
grant select, insert (event_id, goal_cents, created_by), update (goal_cents, updated_by)
  on public.funds to authenticated;
create policy funds_select on public.funds for select to authenticated
  using ((select public.is_approved()));
create policy funds_admin_insert on public.funds for insert to authenticated
  with check ((select public.is_admin()));
create policy funds_admin_update on public.funds for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.fund_settings_history to authenticated;
create policy fund_settings_history_select on public.fund_settings_history for select to authenticated
  using ((select public.is_approved()));

-- fund_transactions: membro registra depósito do próprio núcleo (sempre pendente).
-- Confirmar, recusar, saídas e estornos só pelas funções abaixo. Nada é apagado.
grant select,
  insert (fund_id, kind, household_id, amount_cents, occurred_on, description, receipt_path, created_by)
  on public.fund_transactions to authenticated;
create policy fund_transactions_select on public.fund_transactions for select to authenticated
  using ((select public.is_approved()));
create policy fund_transactions_insert_deposit on public.fund_transactions for insert to authenticated
  with check (
    (select public.is_approved())
    and kind = 'entrada'
    and status = 'pendente'
    and household_id = (select public.my_household_id())
    and created_by = (select public.current_person_id())
  );

-- pantry_items: participantes editam o armazém; remover só autor, admin ou tag Despensa
grant select, insert, update, delete on public.pantry_items to authenticated;
create policy pantry_items_select on public.pantry_items for select to authenticated
  using ((select public.is_approved()));
create policy pantry_items_insert on public.pantry_items for insert to authenticated
  with check ((select public.is_approved()) and created_by = (select public.current_person_id()));
create policy pantry_items_update on public.pantry_items for update to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
create policy pantry_items_delete on public.pantry_items for delete to authenticated
  using (
    (select public.is_approved())
    and (
      created_by = (select public.current_person_id())
      or (select public.is_admin())
      or (select public.has_tag('Despensa'))
    )
  );

-- notifications: cada um lê e marca como lidas as suas
grant select, update (read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_person_id = (select public.current_person_id()));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_person_id = (select public.current_person_id()))
  with check (recipient_person_id = (select public.current_person_id()));

-- ---------------------------------------------------------------------------
-- Funções security definer das ações sensíveis
-- ---------------------------------------------------------------------------

-- Aprovar (ou recusar) um membro. Só admin.
create or replace function public.approve_member(p_person_id uuid, p_approve boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin uuid := public.current_person_id();
  v_user uuid;
begin
  if not public.is_admin() then
    perform public.raise_forbidden('Só o Mestre da Taverna (admin) aprova membros.');
  end if;

  update public.people
  set status = case when p_approve then 'approved' else 'rejected' end,
      approved_by = v_admin,
      approved_at = now()
  where id = p_person_id and user_id is not null and not is_admin
  returning user_id into v_user;

  if v_user is null then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;

  if p_approve then
    insert into public.notifications (recipient_person_id, kind, message, link)
    values (p_person_id, 'membro_aprovado', 'Sua entrada na taverna foi aprovada. Bem-vindo à party!', '/');
  end if;
end;
$$;

-- Atribuir e remover tag de função. Só admin.
create or replace function public.assign_tag(p_person_id uuid, p_tag_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    perform public.raise_forbidden('Só o Mestre da Taverna (admin) atribui tags.');
  end if;
  if not exists (select 1 from public.people where id = p_person_id and user_id is not null and status = 'approved') then
    raise exception 'A tag só pode ir para um membro aprovado com login.' using errcode = '22023';
  end if;

  insert into public.person_tags (person_id, tag_id, assigned_by)
  values (p_person_id, p_tag_id, public.current_person_id())
  on conflict (person_id, tag_id) do nothing;
end;
$$;

create or replace function public.remove_tag(p_person_id uuid, p_tag_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    perform public.raise_forbidden('Só o Mestre da Taverna (admin) remove tags.');
  end if;
  delete from public.person_tags where person_id = p_person_id and tag_id = p_tag_id;
end;
$$;

-- Confirmar depósito. Só Tesoureiro. Notifica quem depositou ("Loot guardado").
create or replace function public.confirm_deposit(p_transaction_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.fund_transactions;
begin
  if not public.has_tag('Tesoureiro') then
    perform public.raise_forbidden('Só o Guardião do Baú (Tesoureiro) confirma depósitos.');
  end if;

  update public.fund_transactions
  set status = 'confirmado', reviewed_by = public.current_person_id(), reviewed_at = now()
  where id = p_transaction_id and kind = 'entrada' and status = 'pendente'
  returning * into v_tx;

  if v_tx.id is null then
    raise exception 'Depósito pendente não encontrado.' using errcode = 'P0002';
  end if;

  if v_tx.created_by is not null then
    insert into public.notifications (recipient_person_id, kind, message, link)
    select v_tx.created_by, 'loot_guardado',
      'Loot guardado! Seu depósito foi confirmado.',
      '/aventuras/' || f.event_id || '/bau'
    from public.funds f where f.id = v_tx.fund_id;
  end if;
end;
$$;

-- Recusar depósito. Só Tesoureiro. O lançamento fica no histórico como recusado.
create or replace function public.refuse_deposit(p_transaction_id uuid, p_note text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.fund_transactions;
begin
  if not public.has_tag('Tesoureiro') then
    perform public.raise_forbidden('Só o Guardião do Baú (Tesoureiro) recusa depósitos.');
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Informe o motivo da recusa.' using errcode = '22023';
  end if;

  update public.fund_transactions
  set status = 'recusado', reviewed_by = public.current_person_id(), reviewed_at = now(), review_note = p_note
  where id = p_transaction_id and kind = 'entrada' and status = 'pendente'
  returning * into v_tx;

  if v_tx.id is null then
    raise exception 'Depósito pendente não encontrado.' using errcode = 'P0002';
  end if;

  if v_tx.created_by is not null then
    insert into public.notifications (recipient_person_id, kind, message, link)
    select v_tx.created_by, 'deposito_recusado',
      'Seu depósito foi recusado. Motivo: ' || p_note,
      '/aventuras/' || f.event_id || '/bau'
    from public.funds f where f.id = v_tx.fund_id;
  end if;
end;
$$;

-- Registrar saída (pagamento feito com o dinheiro do baú). Só Tesoureiro.
create or replace function public.register_withdrawal(
  p_fund_id uuid,
  p_amount_cents integer,
  p_occurred_on date,
  p_description text,
  p_receipt_path text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.has_tag('Tesoureiro') then
    perform public.raise_forbidden('Só o Guardião do Baú (Tesoureiro) registra saídas.');
  end if;
  if coalesce(trim(p_description), '') = '' then
    raise exception 'Descreva a saída.' using errcode = '22023';
  end if;

  insert into public.fund_transactions (
    fund_id, kind, amount_cents, occurred_on, description, receipt_path, status,
    created_by, reviewed_by, reviewed_at
  )
  values (
    p_fund_id, 'saida', p_amount_cents,
    coalesce(p_occurred_on, (now() at time zone 'America/Sao_Paulo')::date),
    p_description, p_receipt_path, 'confirmado',
    public.current_person_id(), public.current_person_id(), now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Estornar um lançamento confirmado com lançamento inverso. Tesoureiro ou admin.
create or replace function public.reverse_transaction(p_transaction_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.fund_transactions;
  v_id uuid;
begin
  if not (public.has_tag('Tesoureiro') or public.is_admin()) then
    perform public.raise_forbidden('Só o Guardião do Baú (Tesoureiro) ou o admin fazem estornos.');
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Informe o motivo do estorno.' using errcode = '22023';
  end if;

  select * into v_tx from public.fund_transactions
  where id = p_transaction_id and kind in ('entrada', 'saida') and status = 'confirmado'
  for update;

  if v_tx.id is null then
    raise exception 'Só lançamentos confirmados podem ser estornados.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.fund_transactions where reverses_id = p_transaction_id) then
    raise exception 'Este lançamento já foi estornado.' using errcode = '23505';
  end if;

  insert into public.fund_transactions (
    fund_id, kind, household_id, amount_cents, description, status, reverses_id,
    created_by, reviewed_by, reviewed_at
  )
  values (
    v_tx.fund_id, 'estorno', v_tx.household_id, v_tx.amount_cents, p_reason, 'confirmado', v_tx.id,
    public.current_person_id(), public.current_person_id(), now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Alterar banco, titular e chave Pix. Só admin. Grava histórico permanente e, quando é
-- troca (já havia dados), marca o aviso de 7 dias e notifica todos os membros.
create or replace function public.update_fund_banking(
  p_fund_id uuid,
  p_bank text,
  p_holder text,
  p_pix_key text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old public.funds;
  v_is_change boolean;
begin
  if not public.is_admin() then
    perform public.raise_forbidden('Só o Mestre da Taverna (admin) altera banco e chave Pix.');
  end if;

  select * into v_old from public.funds where id = p_fund_id for update;
  if v_old.id is null then
    raise exception 'Baú não encontrado.' using errcode = 'P0002';
  end if;

  if v_old.bank is not distinct from p_bank
     and v_old.holder is not distinct from p_holder
     and v_old.pix_key is not distinct from p_pix_key then
    return;
  end if;

  v_is_change := coalesce(v_old.bank, v_old.holder, v_old.pix_key) is not null;

  insert into public.fund_settings_history (
    fund_id, changed_by, old_bank, new_bank, old_holder, new_holder, old_pix_key, new_pix_key
  )
  values (
    p_fund_id, public.current_person_id(),
    v_old.bank, p_bank, v_old.holder, p_holder, v_old.pix_key, p_pix_key
  );

  update public.funds
  set bank = p_bank,
      holder = p_holder,
      pix_key = p_pix_key,
      pix_changed_at = case when v_is_change then now() else pix_changed_at end,
      updated_by = public.current_person_id()
  where id = p_fund_id;

  if v_is_change then
    perform public.notify_all_members(
      'pix_alterado',
      'Atenção: os dados do baú (banco/chave Pix) foram alterados. Confira antes de depositar.',
      '/aventuras/' || v_old.event_id || '/bau'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões de execução das funções
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.current_person_id(),
  public.my_household_id(),
  public.is_approved(),
  public.is_admin(),
  public.has_tag(text),
  public.in_my_household(uuid),
  public.approve_member(uuid, boolean),
  public.assign_tag(uuid, uuid),
  public.remove_tag(uuid, uuid),
  public.confirm_deposit(uuid),
  public.refuse_deposit(uuid, text),
  public.register_withdrawal(uuid, integer, date, text, text),
  public.reverse_transaction(uuid, text),
  public.update_fund_banking(uuid, text, text, text)
to authenticated;
