-- Ajuste da fase 4 a pedido do dono: permissões por PESSOA (não por tag/função).
--   * Cada membro recebe, aba por aba, o que pode ver, editar e excluir.
--   * Nova área "permissoes": quem pode editá-la dá ou tira permissões dos outros
--     (nunca de si mesmo nem do Mestre). O Mestre pode tudo.
--   * Tags viram só títulos (ex.: Guardião do Baú no avatar); não dão permissão.
--   * As permissões que as tags davam passam para as pessoas que tinham a tag.

create table public.person_permissions (
  person_id uuid not null references public.people (id) on delete cascade,
  area text not null check (
    area in ('aventura', 'datas', 'estalagens', 'presenca', 'armazem', 'custos', 'bau', 'membros', 'chat', 'permissoes')
  ),
  can_view boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.people (id) on delete set null,
  primary key (person_id, area),
  constraint person_permissions_ver_antes check (can_view or not (can_edit or can_delete))
);

-- Leva o que as tags davam para as pessoas.
insert into public.person_permissions (person_id, area, can_view, can_edit, can_delete)
select pt.person_id, tp.area, bool_or(tp.can_view), bool_or(tp.can_edit), bool_or(tp.can_delete)
from public.person_tags pt
join public.tag_permissions tp on tp.tag_id = pt.tag_id
group by pt.person_id, tp.area;

drop function public.minhas_permissoes();
drop table public.tag_permissions;

alter table public.person_permissions enable row level security;
revoke all on public.person_permissions from anon, authenticated;
grant select on public.person_permissions to authenticated;
-- Cada um vê as próprias; quem vê a tela de permissões vê as de todos. Escrita só pela função abaixo.

create or replace function public.pode(p_area text, p_acao text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.people p
    join public.person_permissions pp on pp.person_id = p.id
    where p.user_id = (select auth.uid())
      and p.status = 'approved'
      and pp.area = p_area
      and case p_acao
        when 'ver' then pp.can_view
        when 'editar' then pp.can_edit
        when 'excluir' then pp.can_delete
        else false
      end
  );
$$;

create policy person_permissions_select on public.person_permissions for select to authenticated
  using (
    person_id = (select public.current_person_id())
    or (select public.pode('permissoes', 'ver'))
  );

create or replace function public.minhas_permissoes()
returns table (area text, ver boolean, editar boolean, excluir boolean)
language sql stable security definer set search_path = ''
as $$
  select a.area, public.pode(a.area, 'ver'), public.pode(a.area, 'editar'), public.pode(a.area, 'excluir')
  from unnest(array[
    'aventura', 'datas', 'estalagens', 'presenca', 'armazem', 'custos', 'bau', 'membros', 'chat', 'permissoes'
  ]) as a(area)
  where public.is_approved();
$$;

-- Dá ou tira a permissão de uma pessoa numa aba. Editar ou excluir já incluem ver.
create or replace function public.set_person_permission(
  p_person_id uuid,
  p_area text,
  p_ver boolean,
  p_editar boolean,
  p_excluir boolean
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_alvo public.people;
  v_ver boolean := coalesce(p_ver, false) or coalesce(p_editar, false) or coalesce(p_excluir, false);
begin
  if not public.pode('permissoes', 'editar') then
    perform public.raise_forbidden('Só quem tem permissão de editar Permissões dá ou tira permissões.');
  end if;
  select * into v_alvo from public.people where id = p_person_id;
  if v_alvo.id is null or v_alvo.status <> 'approved' or v_alvo.user_id is null then
    raise exception 'Pessoa não encontrada entre os membros aprovados.';
  end if;
  if v_alvo.is_admin then
    perform public.raise_forbidden('O Mestre da Taverna já pode tudo.');
  end if;
  if v_alvo.id = public.current_person_id() then
    perform public.raise_forbidden('Ninguém muda as próprias permissões.');
  end if;
  if v_ver then
    insert into public.person_permissions (person_id, area, can_view, can_edit, can_delete, updated_by)
    values (p_person_id, p_area, true, coalesce(p_editar, false), coalesce(p_excluir, false), public.current_person_id())
    on conflict (person_id, area) do update
      set can_view = true, can_edit = excluded.can_edit, can_delete = excluded.can_delete,
          updated_by = excluded.updated_by, updated_at = now();
  else
    delete from public.person_permissions where person_id = p_person_id and area = p_area;
  end if;
end;
$$;

revoke execute on function public.minhas_permissoes() from public, anon;
revoke execute on function public.set_person_permission(uuid, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.minhas_permissoes() to authenticated;
grant execute on function public.set_person_permission(uuid, text, boolean, boolean, boolean) to authenticated;
