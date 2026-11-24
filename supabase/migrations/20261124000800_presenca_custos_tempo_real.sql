-- Etapa 5: presença e custos atualizam em tempo real para todos.
alter publication supabase_realtime add table
  public.attendances,
  public.cost_items,
  public.cost_weights,
  public.cost_item_optins;

-- Para o Realtime enviar a linha antiga em exclusões (ex.: desfazer adesão a um extra).
alter table public.cost_item_optins replica identity full;
alter table public.cost_weights replica identity full;
