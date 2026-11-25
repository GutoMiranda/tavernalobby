-- O servidor (chave secreta, papel service_role) lê e grava estas tabelas fora do RLS.
-- Projetos Supabase novos podem não dar acesso automático a tabelas novas pela API;
-- deixamos explícito para não depender do padrão do projeto.
grant select, insert, update on public.pix_checkouts to service_role;
grant select on public.funds to service_role;
grant select, insert on public.fund_transactions to service_role;
grant insert on public.notifications to service_role;
grant select, insert, update on public.travel_times to service_role;
