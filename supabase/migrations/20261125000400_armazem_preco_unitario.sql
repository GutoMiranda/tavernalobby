-- Armazém como lista de compras: preço por unidade × quantidade = custo (calculado pelo banco).
alter table public.pantry_items add column unit_price_cents integer
  check (unit_price_cents is null or unit_price_cents >= 0);
-- Itens já cadastrados com custo total: vira preço de 1 unidade quando não há quantidade.
update public.pantry_items
  set unit_price_cents = case when quantity is null or quantity = 0 then cost_cents else round(cost_cents / quantity)::int end
  where cost_cents is not null;
update public.pantry_items set quantity = 1 where cost_cents is not null and (quantity is null or quantity = 0);
alter table public.pantry_items drop column cost_cents;
alter table public.pantry_items add column cost_cents integer
  generated always as (round(coalesce(unit_price_cents, 0) * coalesce(quantity, 0))::integer) stored;
comment on column public.pantry_items.cost_cents is 'Custo total = preço por unidade × quantidade (calculado).';
