-- Pix pela InfinitePay sem aviso automático (site ainda no PC do dono, ou pessoa fechou a página
-- antes de voltar): o Tesoureiro ou o admin confere o pagamento em "Suas vendas" no app da
-- InfinitePay e confirma a cobrança aberta. Fica registrado quem conferiu.
create or replace function public.confirm_pix_checkout_manual(p_checkout_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_c public.pix_checkouts;
  v_id uuid;
  v_eu uuid := public.current_person_id();
begin
  if not (public.has_tag('Tesoureiro') or public.is_admin()) then
    perform public.raise_forbidden('Só o Guardião do Baú (Tesoureiro) ou o admin confirma pagamentos.');
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

revoke execute on function public.confirm_pix_checkout_manual(uuid) from public, anon;
grant execute on function public.confirm_pix_checkout_manual(uuid) to authenticated;
