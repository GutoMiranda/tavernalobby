-- Etapa 4: tempo real (Supabase Realtime) nas reações e listas da aventura.
-- O Realtime respeita o RLS: cada um só recebe mudanças de linhas que pode ler.

alter publication supabase_realtime add table
  public.events,
  public.date_options,
  public.date_reactions,
  public.accommodations,
  public.accommodation_reactions,
  public.households;

-- Para o Realtime enviar a linha antiga em exclusões (ex.: descurtir removendo a reação).
alter table public.date_reactions replica identity full;
alter table public.accommodation_reactions replica identity full;
