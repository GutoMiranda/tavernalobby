-- Foto própria no avatar (opcional; os emblemas continuam como alternativa).
-- Bucket privado: só membros aprovados veem, por URL assinada. Caminho: <auth.uid()>/<arquivo>.webp
alter table public.people
  add column avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
grant update (avatar_path) on public.people to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

create policy avatares_select on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (select public.is_approved()));

create policy avatares_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (select public.is_approved())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Quem enviou pode apagar as próprias fotos antigas.
create policy avatares_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
