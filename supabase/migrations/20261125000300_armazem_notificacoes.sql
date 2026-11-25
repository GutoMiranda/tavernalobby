-- Etapa 7: Armazém (despensa) e notificações.

-- Armazém: quantidade por pessoa é por dia; quem alterou fica registrado pelo banco.
comment on column public.pantry_items.quantity_per_person is
  'Quantidade por pessoa por dia; a sugestão total usa a soma dos dias de quem consome.';
create or replace function public.pantry_items_stamp()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_by := public.current_person_id();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, public.current_person_id());
  end if;
  return new;
end;
$$;
create trigger pantry_items_stamp before insert or update on public.pantry_items
  for each row when (public.current_person_id() is not null)
  execute function public.pantry_items_stamp();

-- Notificações genéricas: quem causou (para avisos de pessoas, como menções no chat futuro).
alter table public.notifications add column actor_person_id uuid references public.people (id) on delete set null;

-- Avisa quem foi escolhido como responsável por um item por outra pessoa.
create or replace function public.pantry_items_notify_responsible()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
begin
  if new.responsible_person_id is not null
     and new.responsible_person_id is distinct from coalesce(v_eu, '00000000-0000-0000-0000-000000000000'::uuid)
     and (tg_op = 'INSERT' or new.responsible_person_id is distinct from old.responsible_person_id) then
    insert into public.notifications (recipient_person_id, kind, message, link, actor_person_id)
    values (
      new.responsible_person_id, 'armazem_responsavel',
      'Você ficou responsável por "' || new.name || '" no Armazém.',
      '/aventuras/' || new.event_id || '/armazem',
      v_eu
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.pantry_items_notify_responsible() from public, anon, authenticated;
create trigger pantry_items_notify_responsible after insert or update of responsible_person_id
  on public.pantry_items for each row execute function public.pantry_items_notify_responsible();

-- O servidor cria lembretes de depósito (e confere se já criou neste mês).
grant select, insert on public.notifications to service_role;
grant select on public.deposit_plans, public.events to service_role;

alter publication supabase_realtime add table public.pantry_items, public.notifications;
