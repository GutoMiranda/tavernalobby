-- Membros: banir (bloqueia para sempre, mesmo com o link de convite) e excluir cadastro.
-- Personagem: sexo (troca o nome do emblema e do título: Mago/Maga, Guardião/Guardiã).

-- ---------------------------------------------------------------------------
-- Novo status 'banned'
-- ---------------------------------------------------------------------------
alter table public.people drop constraint people_status_check;
alter table public.people
  add constraint people_status_check check (status in ('pending', 'approved', 'rejected', 'banned'));

-- Aprovar/recusar não mexe em quem está banido (desbanir é com quem pode excluir membros).
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

  if exists (select 1 from public.people where id = p_person_id and status = 'banned') then
    raise exception 'Este membro está banido. Use "Desbanir" primeiro.' using errcode = '22023';
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

-- Banir / desbanir. Exige "excluir" em Membros. Nunca o Mestre nem a si mesmo.
-- Nada é apagado: presenças, Baú e Pix continuam nas contas.
create or replace function public.ban_member(p_person_id uuid, p_ban boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_alvo public.people%rowtype;
begin
  if not public.pode('membros', 'excluir') then
    perform public.raise_forbidden('Só o Mestre da Taverna ou quem pode excluir em Membros bane alguém.');
  end if;

  select * into v_alvo from public.people where id = p_person_id and user_id is not null;
  if not found then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;
  if v_alvo.is_admin then
    perform public.raise_forbidden('O Mestre da Taverna não pode ser banido.');
  end if;
  if v_alvo.id = v_eu then
    perform public.raise_forbidden('Você não pode banir a si mesmo.');
  end if;

  if p_ban then
    update public.people set status = 'banned', approved_by = v_eu, approved_at = now() where id = p_person_id;
  elsif v_alvo.status = 'banned' then
    update public.people set status = 'approved', approved_by = v_eu, approved_at = now() where id = p_person_id;
  end if;
end;
$$;

-- Excluir cadastro: apaga a pessoa (e o núcleo, se ficar vazio). Exige "excluir" em Membros.
-- Bloqueado quando apagar mexeria em dinheiro: Pix criado por ela, presença em aventura com
-- custos, ou núcleo que ficaria vazio com movimentação no Baú. Nesses casos, use Banir.
-- Devolve o id do login, para o servidor apagar a conta de acesso (auth) em seguida.
create or replace function public.delete_member(p_person_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_alvo public.people%rowtype;
  v_sozinho boolean;
begin
  if not public.pode('membros', 'excluir') then
    perform public.raise_forbidden('Só o Mestre da Taverna ou quem pode excluir em Membros exclui cadastros.');
  end if;

  select * into v_alvo from public.people where id = p_person_id and user_id is not null;
  if not found then
    raise exception 'Membro não encontrado.' using errcode = 'P0002';
  end if;
  if v_alvo.is_admin then
    perform public.raise_forbidden('O cadastro do Mestre da Taverna não pode ser excluído.');
  end if;
  if v_alvo.id = v_eu then
    perform public.raise_forbidden('Você não pode excluir o próprio cadastro.');
  end if;

  if exists (select 1 from public.pix_checkouts where created_by = p_person_id) then
    raise exception 'Este membro já gerou Pix no Baú. Para não mexer nas contas, use "Banir".'
      using errcode = '22023';
  end if;
  if exists (
    select 1 from public.attendances a
    where a.person_id = p_person_id
      and exists (select 1 from public.cost_items c where c.event_id = a.event_id)
  ) then
    raise exception 'Este membro está numa aventura com custos lançados. Para não mudar o rateio, use "Banir".'
      using errcode = '22023';
  end if;

  v_sozinho := not exists (
    select 1 from public.people where household_id = v_alvo.household_id and id <> p_person_id
  );
  if v_sozinho and (
    exists (select 1 from public.fund_transactions where household_id = v_alvo.household_id)
    or exists (select 1 from public.pix_checkouts where household_id = v_alvo.household_id)
  ) then
    raise exception 'A família deste membro tem movimentação no Baú. Para não mexer nas contas, use "Banir".'
      using errcode = '22023';
  end if;

  delete from public.people where id = p_person_id;
  if v_sozinho then
    delete from public.households where id = v_alvo.household_id;
  end if;

  return v_alvo.user_id;
end;
$$;

revoke execute on function
  public.ban_member(uuid, boolean),
  public.delete_member(uuid)
from public, anon;
grant execute on function
  public.ban_member(uuid, boolean),
  public.delete_member(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Sexo do personagem (opcional): 'm' ou 'f'
-- ---------------------------------------------------------------------------
alter table public.people add column gender text check (gender is null or gender in ('m', 'f'));
grant update (gender) on public.people to authenticated;
