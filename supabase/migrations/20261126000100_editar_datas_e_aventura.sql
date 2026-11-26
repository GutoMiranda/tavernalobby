-- Datas e aventura sempre editáveis (pedido do dono em 26/11/2026).
-- 1) Editar a data definida atualiza o período da aventura.
-- 2) Excluir a data definida deixa a aventura sem data (e volta para a votação se estava na escolha de estalagem).
-- 3) Excluir a aventura inteira: só com "excluir" em Aventuras e só se o baú nunca teve movimento
--    (dinheiro não se apaga: nesse caso, cancele a aventura).

create or replace function public.sync_chosen_date_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    update public.events
       set start_date = new.start_date, end_date = new.end_date
     where chosen_date_option_id = new.id
       and (start_date is distinct from new.start_date or end_date is distinct from new.end_date);
    return new;
  end if;
  -- DELETE
  update public.events
     set chosen_date_option_id = null,
         start_date = null,
         end_date = null,
         phase = case when phase = 'estalagens' then 'datas' else phase end
   where chosen_date_option_id = old.id;
  return old;
end;
$$;

revoke all on function public.sync_chosen_date_option() from public;

create trigger date_options_sync_after_update
  after update of start_date, end_date on public.date_options
  for each row execute function public.sync_chosen_date_option();

create trigger date_options_sync_before_delete
  before delete on public.date_options
  for each row execute function public.sync_chosen_date_option();

create or replace function public.delete_event(p_event uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not public.pode('aventura', 'excluir') then
    raise exception 'Você não tem permissão para excluir aventuras.' using errcode = '42501';
  end if;
  select name into v_name from public.events where id = p_event;
  if v_name is null then
    raise exception 'Aventura não encontrada.' using errcode = 'P0002';
  end if;
  if lower(trim(coalesce(p_confirm_name, ''))) <> lower(trim(v_name)) then
    raise exception 'Digite o nome da aventura exatamente como está para confirmar.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.fund_transactions t join public.funds f on f.id = t.fund_id where f.event_id = p_event
  ) or exists (
    select 1 from public.pix_checkouts c join public.funds f on f.id = c.fund_id where f.event_id = p_event
  ) then
    raise exception 'Esta aventura já teve dinheiro no baú, e dinheiro não se apaga. Use a fase "Cancelada" em vez de excluir.'
      using errcode = 'P0001';
  end if;
  delete from public.events where id = p_event;
end;
$$;

revoke all on function public.delete_event(uuid, text) from public;
grant execute on function public.delete_event(uuid, text) to authenticated;
