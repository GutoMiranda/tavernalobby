-- Cancelar cobrança do Pix automático que não foi paga (Tesoureiro ou admin).
-- Não apaga: a cobrança fica no histórico como "cancelado", com quem cancelou. Se a InfinitePay
-- confirmar o pagamento depois, o crédito continua entrando (o dinheiro chegou de fato).
alter table public.pix_checkouts drop constraint pix_checkouts_status_check;
alter table public.pix_checkouts add constraint pix_checkouts_status_check
  check (status in ('aberto', 'pago', 'cancelado'));
alter table public.pix_checkouts
  add column canceled_by uuid references public.people (id) on delete set null,
  add column canceled_at timestamptz;

create or replace function public.cancel_pix_checkout(p_checkout_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.has_tag('Tesoureiro') or public.is_admin()) then
    perform public.raise_forbidden('Só o Guardião do Baú (Tesoureiro) ou o admin cancelam cobranças.');
  end if;
  update public.pix_checkouts
  set status = 'cancelado', canceled_by = public.current_person_id(), canceled_at = now()
  where id = p_checkout_id and status = 'aberto';
  if not found then
    raise exception 'Cobrança aberta não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.cancel_pix_checkout(uuid) from public, anon;
grant execute on function public.cancel_pix_checkout(uuid) to authenticated;
