-- Tomatina — chat media storage (moderated pipeline, invariant 5)
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Flow: clients may ONLY write into their own quarantine/ folder and can
-- read nothing. The game server (service role) downloads, moderates, and
-- moves approved files to approved/, serving them via signed URLs. Media
-- therefore cannot reach another user without passing moderation.

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

drop policy if exists "upload to own quarantine only" on storage.objects;
create policy "upload to own quarantine only"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'quarantine'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- No select/update/delete policies for clients: quarantine is write-only,
-- approved/ is reachable only through server-signed URLs.
