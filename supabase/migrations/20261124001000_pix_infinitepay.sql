-- Pix com confirmação automática pela InfinitePay (checkout integrado).
-- O site cria um link de pagamento; quando a InfinitePay avisa (webhook) ou a pessoa volta
-- do pagamento, o servidor confere na API da InfinitePay e só então credita o depósito,
-- já confirmado, sem passar pelo tesoureiro.

-- Cobranças abertas pelo site. id = order_nsu enviado à InfinitePay.
create table public.pix_checkouts (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references public.funds (id) on delete restrict,
  household_id uuid not null references public.households (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 100),
  checkout_url text not null,
  status text not null default 'aberto' check (status in ('aberto', 'pago')),
  transaction_id uuid references public.fund_transactions (id) on delete restrict,
  invoice_slug text,
  transaction_nsu text,
  capture_method text,
  paid_amount_cents integer,
  receipt_url text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.people (id) on delete restrict,
  paid_at timestamptz
);
create index pix_checkouts_fund_idx on public.pix_checkouts (fund_id, created_at desc);
alter table public.pix_checkouts enable row level security;

-- Membro abre cobrança só para o próprio núcleo, sempre "aberto". Marcar como pago: só o servidor.
revoke all on public.pix_checkouts from anon, authenticated;
grant select, insert (id, fund_id, household_id, amount_cents, checkout_url, created_by)
  on public.pix_checkouts to authenticated;
create policy pix_checkouts_select on public.pix_checkouts for select to authenticated
  using ((select public.is_approved()));
create policy pix_checkouts_insert on public.pix_checkouts for insert to authenticated
  with check (
    (select public.is_approved())
    and household_id = (select public.my_household_id())
    and created_by = (select public.current_person_id())
    and status = 'aberto'
  );

-- Comprovante da InfinitePay no lançamento confirmado automaticamente.
alter table public.fund_transactions add column external_receipt_url text;

-- Credita a cobrança paga (chamada só pelo servidor, com a chave secreta, depois de conferir na API).
-- Idempotente: se já foi paga, devolve o lançamento existente.
create or replace function public.confirm_pix_checkout(
  p_checkout_id uuid,
  p_paid_amount_cents integer,
  p_invoice_slug text,
  p_transaction_nsu text,
  p_capture_method text,
  p_receipt_url text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_c public.pix_checkouts;
  v_id uuid;
begin
  select * into v_c from public.pix_checkouts where id = p_checkout_id for update;
  if v_c.id is null then
    raise exception 'Cobrança não encontrada.' using errcode = 'P0002';
  end if;
  if v_c.status = 'pago' then
    return v_c.transaction_id;
  end if;

  insert into public.fund_transactions (
    fund_id, kind, household_id, amount_cents, description, status,
    created_by, reviewed_at, external_receipt_url
  )
  values (
    v_c.fund_id, 'entrada', v_c.household_id, v_c.amount_cents,
    'Pix pela InfinitePay (confirmado automaticamente)', 'confirmado',
    v_c.created_by, now(), p_receipt_url
  )
  returning id into v_id;

  update public.pix_checkouts
  set status = 'pago', transaction_id = v_id, paid_at = now(),
      paid_amount_cents = p_paid_amount_cents, invoice_slug = p_invoice_slug,
      transaction_nsu = p_transaction_nsu, capture_method = p_capture_method, receipt_url = p_receipt_url
  where id = v_c.id;

  insert into public.notifications (recipient_person_id, kind, message, link)
  select v_c.created_by, 'loot_guardado',
    'Loot guardado! Seu Pix foi confirmado automaticamente.',
    '/aventuras/' || f.event_id || '/bau'
  from public.funds f where f.id = v_c.fund_id;

  return v_id;
end;
$$;

revoke execute on function public.confirm_pix_checkout(uuid, integer, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.confirm_pix_checkout(uuid, integer, text, text, text, text) to service_role;

alter publication supabase_realtime add table public.pix_checkouts;
