-- Rebranding fase 3: avatares (personagem), epíteto e chat geral do grupo com menções e dúvidas.

-- ---------------------------------------------------------------------------
-- Personagem: avatar temático (desenho do site, sem foto), cor e epíteto ("o Bardo do Churrasco").
-- ---------------------------------------------------------------------------
alter table public.people
  add column avatar text check (
    avatar is null or avatar in (
      'guerreiro', 'maga', 'ladino', 'bardo', 'clerigo', 'druida', 'anao', 'arqueira', 'taverneiro', 'dragao', 'cavaleiro', 'feiticeiro'
    )
  ),
  add column avatar_color text check (
    avatar_color is null or avatar_color in ('ambar', 'brasa', 'garrafa', 'noite', 'vinho', 'pedra', 'floresta', 'ouro')
  ),
  add column epithet text check (epithet is null or length(trim(epithet)) between 1 and 40);

-- Mesmo critério de antes: cada um edita as pessoas do próprio núcleo.
grant update (avatar, avatar_color, epithet) on public.people to authenticated;

-- ---------------------------------------------------------------------------
-- Chat geral do grupo (um só, não por aventura). Escrita só pelas funções abaixo.
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_person_id uuid not null references public.people (id) on delete cascade,
  body text not null,
  is_question boolean not null default false,
  reply_to uuid references public.chat_messages (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.people (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chat_body_len check (
    (deleted_at is null and length(trim(body)) between 1 and 2000) or (deleted_at is not null and body = '')
  )
);
create index chat_messages_created_idx on public.chat_messages (created_at desc);

create table public.chat_mentions (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (message_id, person_id)
);
create index chat_mentions_person_idx on public.chat_mentions (person_id);

alter table public.chat_messages enable row level security;
alter table public.chat_mentions enable row level security;

revoke all on public.chat_messages, public.chat_mentions from anon, authenticated;
grant select on public.chat_messages, public.chat_mentions to authenticated;
create policy chat_messages_select on public.chat_messages for select to authenticated
  using ((select public.is_approved()));
create policy chat_mentions_select on public.chat_mentions for select to authenticated
  using ((select public.is_approved()));

-- Trecho curto da mensagem para o aviso do sino.
create or replace function public.chat_trecho(p_body text)
returns text
language sql immutable set search_path = ''
as $$
  select case when length(p_body) > 80 then left(p_body, 77) || '…' else p_body end;
$$;

-- Envia mensagem: corpo, se é dúvida, quem foi mencionado e a mensagem respondida.
-- Avisa (sino) cada mencionado e, numa resposta a uma dúvida, quem perguntou.
create or replace function public.post_chat_message(
  p_body text,
  p_is_question boolean default false,
  p_mentions uuid[] default '{}',
  p_reply_to uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_nome text;
  v_id uuid;
  v_corpo text := trim(coalesce(p_body, ''));
  v_pergunta record;
begin
  if v_eu is null or not public.is_approved() then
    perform public.raise_forbidden('Só membros aprovados usam o chat.');
  end if;
  if length(v_corpo) = 0 or length(v_corpo) > 2000 then
    raise exception 'A mensagem precisa ter de 1 a 2000 caracteres.' using errcode = '22023';
  end if;
  if coalesce(array_length(p_mentions, 1), 0) > 20 then
    raise exception 'Mencione no máximo 20 pessoas por mensagem.' using errcode = '22023';
  end if;
  if p_reply_to is not null and not exists (select 1 from public.chat_messages where id = p_reply_to) then
    raise exception 'Mensagem respondida não encontrada.' using errcode = '22023';
  end if;

  select name into v_nome from public.people where id = v_eu;

  insert into public.chat_messages (author_person_id, body, is_question, reply_to)
  values (v_eu, v_corpo, coalesce(p_is_question, false), p_reply_to)
  returning id into v_id;

  -- Só membros aprovados com login podem ser mencionados.
  insert into public.chat_mentions (message_id, person_id)
  select distinct v_id, p.id
  from public.people p
  where p.id = any (coalesce(p_mentions, '{}'))
    and p.user_id is not null and p.status = 'approved';

  insert into public.notifications (recipient_person_id, kind, message, link, actor_person_id)
  select m.person_id,
         case when p_is_question then 'chat_pergunta' else 'chat_mencao' end,
         case when p_is_question
           then v_nome || ' te fez uma pergunta no chat: “' || public.chat_trecho(v_corpo) || '”'
           else v_nome || ' mencionou você no chat: “' || public.chat_trecho(v_corpo) || '”'
         end,
         '/chat#m-' || v_id,
         v_eu
  from public.chat_mentions m
  where m.message_id = v_id and m.person_id <> v_eu;

  -- Resposta a uma dúvida avisa quem perguntou (se não foi mencionado e não é a própria pessoa).
  if p_reply_to is not null then
    select author_person_id, is_question into v_pergunta from public.chat_messages where id = p_reply_to;
    if v_pergunta.is_question and v_pergunta.author_person_id <> v_eu
       and not exists (select 1 from public.chat_mentions where message_id = v_id and person_id = v_pergunta.author_person_id) then
      insert into public.notifications (recipient_person_id, kind, message, link, actor_person_id)
      values (
        v_pergunta.author_person_id, 'chat_resposta',
        v_nome || ' respondeu sua dúvida: “' || public.chat_trecho(v_corpo) || '”',
        '/chat#m-' || v_id, v_eu
      );
    end if;
  end if;

  return v_id;
end;
$$;

-- Marca uma dúvida como resolvida (quem perguntou ou o admin). Chamar de novo desfaz.
create or replace function public.toggle_chat_question_resolved(p_message_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_msg record;
begin
  select author_person_id, is_question, resolved_at, deleted_at into v_msg
  from public.chat_messages where id = p_message_id;
  if not found or not v_msg.is_question or v_msg.deleted_at is not null then
    raise exception 'Dúvida não encontrada.' using errcode = '22023';
  end if;
  if v_eu is null or not public.is_approved() or (v_msg.author_person_id <> v_eu and not public.is_admin()) then
    perform public.raise_forbidden('Só quem perguntou ou o Mestre da Taverna marcam a dúvida como resolvida.');
  end if;
  update public.chat_messages
  set resolved_at = case when resolved_at is null then now() end,
      resolved_by = case when resolved_at is null then v_eu end
  where id = p_message_id;
  return v_msg.resolved_at is null;
end;
$$;

-- Apaga uma mensagem (autor ou admin): some o texto, fica o registro de que existiu.
create or replace function public.delete_chat_message(p_message_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_eu uuid := public.current_person_id();
  v_autor uuid;
begin
  select author_person_id into v_autor from public.chat_messages where id = p_message_id and deleted_at is null;
  if not found then
    raise exception 'Mensagem não encontrada.' using errcode = '22023';
  end if;
  if v_eu is null or not public.is_approved() or (v_autor <> v_eu and not public.is_admin()) then
    perform public.raise_forbidden('Só quem escreveu ou o Mestre da Taverna apagam a mensagem.');
  end if;
  update public.chat_messages set body = '', deleted_at = now() where id = p_message_id;
  delete from public.chat_mentions where message_id = p_message_id;
end;
$$;

revoke execute on function public.post_chat_message(text, boolean, uuid[], uuid) from public, anon;
revoke execute on function public.toggle_chat_question_resolved(uuid) from public, anon;
revoke execute on function public.delete_chat_message(uuid) from public, anon;
grant execute on function public.post_chat_message(text, boolean, uuid[], uuid) to authenticated;
grant execute on function public.toggle_chat_question_resolved(uuid) to authenticated;
grant execute on function public.delete_chat_message(uuid) to authenticated;

alter publication supabase_realtime add table public.chat_messages;
