-- Decidir a estalagem: permissão própria (área "decisao"), só o Mestre por padrão.
-- Decidir define o destino, encerra as curtidas das estalagens e fixa custos e rotas; dá para desfazer.

alter table public.person_permissions drop constraint person_permissions_area_check;
alter table public.person_permissions add constraint person_permissions_area_check check (
  area in (
    'aventura', 'datas', 'estalagens', 'decisao', 'presenca', 'armazem', 'custos', 'bau', 'membros', 'chat', 'permissoes'
  )
);

create or replace function public.minhas_permissoes()
returns table (area text, ver boolean, editar boolean, excluir boolean)
language sql stable security definer set search_path = ''
as $$
  select a.area, public.pode(a.area, 'ver'), public.pode(a.area, 'editar'), public.pode(a.area, 'excluir')
  from unnest(array[
    'aventura', 'datas', 'estalagens', 'decisao', 'presenca', 'armazem', 'custos', 'bau', 'membros', 'chat', 'permissoes'
  ]) as a(area)
  where public.is_approved();
$$;

-- Só quem decide muda a estalagem definida. Exceções: o servidor (sem usuário) e a própria estalagem sendo
-- apagada (a chave estrangeira limpa o campo sozinha).
create or replace function public.guard_estalagem_decidida()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.chosen_accommodation_id is distinct from old.chosen_accommodation_id
     and auth.uid() is not null
     and not public.pode('decisao', 'editar')
     and not (
       new.chosen_accommodation_id is null
       and not exists (select 1 from public.accommodations where id = old.chosen_accommodation_id)
     ) then
    perform public.raise_forbidden('Só quem tem a permissão "Decidir a estalagem" define ou desfaz a estalagem.');
  end if;
  return new;
end;
$$;
create trigger events_guard_decisao before update of chosen_accommodation_id on public.events
  for each row execute function public.guard_estalagem_decidida();

-- Com a estalagem decidida, as curtidas e descurtidas ficam encerradas. Apagar a estalagem ou a pessoa
-- (exclusão em cascata) continua funcionando.
create or replace function public.guard_curtidas_encerradas()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_alvo uuid := coalesce(new.accommodation_id, old.accommodation_id);
  v_pessoa uuid := coalesce(new.person_id, old.person_id);
begin
  if exists (
       select 1 from public.accommodations a
       join public.events e on e.id = a.event_id
       where a.id = v_alvo and e.chosen_accommodation_id is not null
     )
     and exists (select 1 from public.people where id = v_pessoa) then
    raise exception 'A estalagem já foi decidida: as curtidas estão encerradas.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger accommodation_reactions_encerradas before insert or update or delete on public.accommodation_reactions
  for each row execute function public.guard_curtidas_encerradas();

-- Decide (ou troca) a estalagem. A primeira decisão leva a aventura para a confirmação de presença.
create or replace function public.decide_accommodation(p_event_id uuid, p_accommodation_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_fase text;
begin
  if not public.pode('decisao', 'editar') then
    perform public.raise_forbidden('Só quem tem a permissão "Decidir a estalagem" define a estalagem.');
  end if;
  if not exists (select 1 from public.accommodations where id = p_accommodation_id and event_id = p_event_id) then
    raise exception 'Estalagem não encontrada nesta aventura.' using errcode = 'P0002';
  end if;
  select phase into v_fase from public.events where id = p_event_id;
  update public.events
  set chosen_accommodation_id = p_accommodation_id,
      phase = case when phase in ('datas', 'estalagens') then 'presenca' else phase end
  where id = p_event_id;
  return case when v_fase in ('datas', 'estalagens') then 'avancou' else 'trocou' end;
end;
$$;

-- Desfaz a decisão: reabre as curtidas (e a votação de estalagens, se ainda estava na presença).
create or replace function public.undo_accommodation_decision(p_event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.pode('decisao', 'editar') then
    perform public.raise_forbidden('Só quem tem a permissão "Decidir a estalagem" desfaz a decisão.');
  end if;
  update public.events
  set chosen_accommodation_id = null,
      phase = case when phase = 'presenca' then 'estalagens' else phase end
  where id = p_event_id;
end;
$$;

revoke execute on function
  public.decide_accommodation(uuid, uuid),
  public.undo_accommodation_decision(uuid)
from public, anon;
grant execute on function
  public.decide_accommodation(uuid, uuid),
  public.undo_accommodation_decision(uuid)
to authenticated;
