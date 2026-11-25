-- Fase 4 do rebranding: permissões por aba (ver, editar, excluir) dadas pelas tags.
--   * O Mestre da Taverna (admin) pode tudo.
--   * Cada tag recebe, para cada aba (área), o que pode ver, editar e excluir.
--     "Ver" = enxergar a área no Salão do Mestre; "Editar" = criar e alterar; "Excluir" = remover, estornar, cancelar.
--   * O que é de todos continua igual (votar, confirmar a própria presença, depositar, editar o armazém, conversar).
--   * Continuam só do Mestre: tags e permissões, banco e chave Pix, meta do baú.
-- A conferência é no banco: políticas e funções passam a usar public.pode(área, ação).

create table public.tag_permissions (
  tag_id uuid not null references public.tags (id) on delete cascade,
  area text not null check (
    area in ('aventura', 'datas', 'estalagens', 'presenca', 'armazem', 'custos', 'bau', 'membros', 'chat')
  ),
  can_view boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null,
  primary key (tag_id, area),
  -- Quem edita ou exclui também precisa ver a área.
  constraint tag_permissions_ver_antes check (can_view or not (can_edit or can_delete))
);

alter table public.tag_permissions enable row level security;
revoke all on public.tag_permissions from anon, authenticated;
grant select, insert, update, delete on public.tag_permissions to authenticated;
create policy tag_permissions_select on public.tag_permissions for select to authenticated
  using ((select public.is_approved()));
create policy tag_permissions_admin_insert on public.tag_permissions for insert to authenticated
  with check ((select public.is_admin()));
create policy tag_permissions_admin_update on public.tag_permissions for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tag_permissions_admin_delete on public.tag_permissions for delete to authenticated
  using ((select public.is_admin()));

-- As duas tags que já existiam mantêm o que faziam.
insert into public.tag_permissions (tag_id, area, can_view, can_edit, can_delete)
select id, 'bau', true, true, true from public.tags where name = 'Tesoureiro'
union all
select id, 'armazem', true, true, true from public.tags where name = 'Despensa';

-- Pode? (Mestre pode tudo; os demais pelas tags.) p_acao: 'ver' | 'editar' | 'excluir'.
create or replace function public.pode(p_area text, p_acao text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.people p
    join public.person_tags pt on pt.person_id = p.id
    join public.tag_permissions tp on tp.tag_id = pt.tag_id
    where p.user_id = (select auth.uid())
      and p.status = 'approved'
      and tp.area = p_area
      and case p_acao
        when 'ver' then tp.can_view
        when 'editar' then tp.can_edit
        when 'excluir' then tp.can_delete
        else false
      end
  );
$$;

-- O que a pessoa logada pode em cada área (para a tela montar o Salão do Mestre).
create or replace function public.minhas_permissoes()
returns table (area text, ver boolean, editar boolean, excluir boolean)
language sql stable security definer set search_path = ''
as $$
  select a.area, public.pode(a.area, 'ver'), public.pode(a.area, 'editar'), public.pode(a.area, 'excluir')
  from unnest(array['aventura', 'datas', 'estalagens', 'presenca', 'armazem', 'custos', 'bau', 'membros', 'chat']) as a(area)
  where public.is_approved();
$$;

-- ---------------------------------------------------------------------------
-- Políticas: troca "só admin" por "quem pode"
-- ---------------------------------------------------------------------------
drop policy events_admin_insert on public.events;
drop policy events_admin_update on public.events;
drop policy events_admin_delete on public.events;
create policy events_insert on public.events for insert to authenticated
  with check ((select public.pode('aventura', 'editar')));
-- Fechar a votação de datas, escolher a estalagem e o ponto de encontro também gravam na aventura.
create policy events_update on public.events for update to authenticated
  using (
    (select public.pode('aventura', 'editar'))
    or (select public.pode('datas', 'editar'))
    or (select public.pode('estalagens', 'editar'))
  )
  with check (
    (select public.pode('aventura', 'editar'))
    or (select public.pode('datas', 'editar'))
    or (select public.pode('estalagens', 'editar'))
  );
create policy events_delete on public.events for delete to authenticated
  using ((select public.pode('aventura', 'excluir')));

drop policy date_options_admin_insert on public.date_options;
drop policy date_options_admin_update on public.date_options;
drop policy date_options_admin_delete on public.date_options;
create policy date_options_insert on public.date_options for insert to authenticated
  with check ((select public.pode('datas', 'editar')));
create policy date_options_update on public.date_options for update to authenticated
  using ((select public.pode('datas', 'editar'))) with check ((select public.pode('datas', 'editar')));
create policy date_options_delete on public.date_options for delete to authenticated
  using ((select public.pode('datas', 'excluir')));

drop policy accommodations_update on public.accommodations;
drop policy accommodations_delete on public.accommodations;
create policy accommodations_update on public.accommodations for update to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.pode('estalagens', 'editar')))
  )
  with check ((select public.is_approved()));
create policy accommodations_delete on public.accommodations for delete to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.pode('estalagens', 'excluir')))
  );

drop policy attendances_insert on public.attendances;
drop policy attendances_update on public.attendances;
create policy attendances_insert on public.attendances for insert to authenticated
  with check (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.pode('presenca', 'editar')))
  );
create policy attendances_update on public.attendances for update to authenticated
  using (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.pode('presenca', 'editar')))
  )
  with check (public.in_my_household(person_id) or (select public.pode('presenca', 'editar')));

drop policy cost_items_admin_insert on public.cost_items;
drop policy cost_items_admin_update on public.cost_items;
drop policy cost_items_admin_delete on public.cost_items;
create policy cost_items_insert on public.cost_items for insert to authenticated
  with check ((select public.pode('custos', 'editar')));
create policy cost_items_update on public.cost_items for update to authenticated
  using ((select public.pode('custos', 'editar'))) with check ((select public.pode('custos', 'editar')));
create policy cost_items_delete on public.cost_items for delete to authenticated
  using ((select public.pode('custos', 'excluir')));

drop policy cost_weights_admin_insert on public.cost_weights;
drop policy cost_weights_admin_update on public.cost_weights;
drop policy cost_weights_admin_delete on public.cost_weights;
create policy cost_weights_insert on public.cost_weights for insert to authenticated
  with check ((select public.pode('custos', 'editar')));
create policy cost_weights_update on public.cost_weights for update to authenticated
  using ((select public.pode('custos', 'editar'))) with check ((select public.pode('custos', 'editar')));
-- Tirar um ajuste de peso é voltar ao padrão (faz parte de editar os custos).
create policy cost_weights_delete on public.cost_weights for delete to authenticated
  using ((select public.pode('custos', 'editar')));

drop policy cost_item_optins_insert on public.cost_item_optins;
drop policy cost_item_optins_delete on public.cost_item_optins;
create policy cost_item_optins_insert on public.cost_item_optins for insert to authenticated
  with check (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.pode('custos', 'editar')))
  );
create policy cost_item_optins_delete on public.cost_item_optins for delete to authenticated
  using (
    (select public.is_approved())
    and (public.in_my_household(person_id) or (select public.pode('custos', 'editar')))
  );

drop policy pantry_items_delete on public.pantry_items;
create policy pantry_items_delete on public.pantry_items for delete to authenticated
  using (
    (select public.is_approved())
    and (created_by = (select public.current_person_id()) or (select public.pode('armazem', 'excluir')))
  );

-- ---------------------------------------------------------------------------
-- Funções: mesma lógica de antes, com a conferência por área
-- ---------------------------------------------------------------------------
create or replace function public.approve_member(p_person_id uuid, p_approve boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin uuid := public.current_person_id();
  v_user uuid;
begin
  if not public.pode('membros', 'editar') then
    perform public.raise_forbidden('Só o Mestre da Taverna ou quem tem permissão em Membros aprova membros.');
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

create or replace function public.regenerate_invite_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  if not public.pode('membros', 'editar') then
    perform public.raise_forbidden('Só o Mestre da Taverna ou quem tem permissão em Membros gera um novo convite.');
  end if;
  update public.groups set invite_code = v_code;
  return v_code;
end;
$$;

create or replace function public.confirm_deposit(p_transaction_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.fund_transactions;
begin
  if not public.pode('bau', 'editar') then
    perform public.raise_forbidden('Só quem tem permissão de editar o Baú confirma depósitos.');
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

create or replace function public.refuse_deposit(p_transaction_id uuid, p_note text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.fund_transactions;
begin
  if not public.pode('bau', 'editar') then
    perform public.raise_forbidden('Só quem tem permissão de editar o Baú recusa depósitos.');
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
  if not public.pode('bau', 'editar') then
    perform public.raise_forbidden('Só quem tem permissão de editar o Baú registra saídas.');
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

create or replace function public.reverse_transaction(p_transaction_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.fund_transactions;
  v_id uuid;
begin
  if not public.pode('bau', 'excluir') then
    perform public.raise_forbidden('Só quem tem permissão de excluir no Baú faz estornos.');
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

create or replace function public.confirm_pix_checkout_manual(p_checkout_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_c public.pix_checkouts;
  v_id uuid;
  v_eu uuid := public.current_person_id();
begin
  if not public.pode('bau', 'editar') then
    perform public.raise_forbidden('Só quem tem permissão de editar o Baú confirma pagamentos.');
  end if;

  select * into v_c from public.pix_checkouts where id = p_checkout_id for update;
  if v_c.id is null then
    raise exception 'Cobrança não encontrada.' using errcode = 'P0002';
  end if;
  if v_c.status = 'pago' then
    return v_c.transaction_id;
  end if;

  insert into public.fund_transactions (
    fund_id, kind, household_id, amount_cents, description, status,
    created_by, reviewed_by, reviewed_at
  )
  values (
    v_c.fund_id, 'entrada', v_c.household_id, v_c.amount_cents,
    'Pix pela InfinitePay (conferido no app da InfinitePay)', 'confirmado',
    v_c.created_by, v_eu, now()
  )
  returning id into v_id;

  update public.pix_checkouts
  set status = 'pago', transaction_id = v_id, paid_at = now(), capture_method = 'conferido_manual'
  where id = v_c.id;

  insert into public.notifications (recipient_person_id, kind, message, link)
  select v_c.created_by, 'loot_guardado',
    'Loot guardado! Seu Pix foi confirmado.',
    '/aventuras/' || f.event_id || '/bau'
  from public.funds f where f.id = v_c.fund_id;

  return v_id;
end;
$$;

create or replace function public.cancel_pix_checkout(p_checkout_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.pode('bau', 'excluir') then
    perform public.raise_forbidden('Só quem tem permissão de excluir no Baú cancela cobranças.');
  end if;
  update public.pix_checkouts
  set status = 'cancelado', canceled_by = public.current_person_id(), canceled_at = now()
  where id = p_checkout_id and status = 'aberto';
  if not found then
    raise exception 'Cobrança aberta não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.toggle_chat_question_resolved(p_message_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_msg record;
begin
  select author_person_id, is_question, resolved_at, deleted_at into v_msg
  from public.chat_messages where id = p_message_id;
  if not found or not v_msg.is_question or v_msg.deleted_at is not null then
    raise exception 'Dúvida não encontrada.' using errcode = '22023';
  end if;
  if v_eu is null or not public.is_approved() or (v_msg.author_person_id <> v_eu and not public.pode('chat', 'editar')) then
    perform public.raise_forbidden('Só quem perguntou ou quem modera o chat marca a dúvida como resolvida.');
  end if;
  update public.chat_messages
  set resolved_at = case when resolved_at is null then now() end,
      resolved_by = case when resolved_at is null then v_eu end
  where id = p_message_id;
  return v_msg.resolved_at is null;
end;
$$;

create or replace function public.delete_chat_message(p_message_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_autor uuid;
begin
  select author_person_id into v_autor from public.chat_messages where id = p_message_id and deleted_at is null;
  if not found then
    raise exception 'Mensagem não encontrada.' using errcode = '22023';
  end if;
  if v_eu is null or not public.is_approved() or (v_autor <> v_eu and not public.pode('chat', 'excluir')) then
    perform public.raise_forbidden('Só quem escreveu ou quem modera o chat apaga a mensagem.');
  end if;
  update public.chat_messages set body = '', deleted_at = now() where id = p_message_id;
  delete from public.chat_mentions where message_id = p_message_id;
end;
$$;

revoke execute on function public.pode(text, text) from public, anon;
revoke execute on function public.minhas_permissoes() from public, anon;
grant execute on function public.pode(text, text) to authenticated;
grant execute on function public.minhas_permissoes() to authenticated;
