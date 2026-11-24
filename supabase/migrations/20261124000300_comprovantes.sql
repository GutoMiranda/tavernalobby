-- Bucket privado de comprovantes (depósitos e saídas do baú).
-- Arquivos servidos só por URL assinada temporária. Caminho: <auth.uid()>/<arquivo>.
-- Nada é apagado nem sobrescrito (sem políticas de update/delete).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovantes', 'comprovantes', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy comprovantes_select on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (select public.is_approved()));

create policy comprovantes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (select public.is_approved())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
