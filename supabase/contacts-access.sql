-- =============================================================================
-- Join – Umbau der Zugriffsregeln für "contacts" (für die bestehende Datenbank)
--
-- Einmal im Supabase SQL Editor ausführen:
-- Dashboard → SQL Editor → New query → alles einfügen → Run
--
-- Bestehende Kontakte ohne user_id werden dadurch zu Dummy-Kontakten.
-- Die Tabelle und die Daten bleiben erhalten, der Umbau ist wiederholbar.
-- =============================================================================

begin;

-- Neue Spalte: wer hat den Kontakt angelegt? Bestehende Zeilen bleiben leer (NULL).
alter table public.contacts
  add column if not exists created_by uuid references auth.users (id) on delete cascade;
alter table public.contacts alter column created_by set default auth.uid();
create index if not exists contacts_created_by_idx on public.contacts (created_by);

-- -----------------------------------------------------------------------------
-- Zugriffsregeln für Kontakte
--
--   Gast (anonymer Login)
--     sieht, ändert und löscht nur Dummy-Kontakte (ohne user_id und ohne
--     created_by) und die Kontakte, die er selbst angelegt hat.
--   Registrierter Nutzer
--     sieht Dummy-Kontakte, alle registrierten Nutzer und die selbst angelegten
--     Kontakte. Ändern und Löschen darf er nur den eigenen Kontakt (Profil)
--     und die selbst angelegten Kontakte.
--   Ohne Login (anon): kein Zugriff.
--
--   user_id    = Konto, zu dem der Kontakt gehört (nur beim Profil-Kontakt)
--   created_by = Konto, das den Kontakt angelegt hat (Standard: auth.uid())
-- -----------------------------------------------------------------------------

-- Ist der aktuelle Nutzer ein Gast?
create or replace function public.is_guest()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

grant execute on function public.is_guest() to authenticated;

-- Rechte: Ohne Login nichts. Eingeloggte dürfen nur die vier Formularfelder
-- schreiben, user_id und created_by lassen sich nicht von außen setzen.
revoke all on public.contacts from anon;
revoke insert, update on public.contacts from authenticated;
grant select, delete on public.contacts to authenticated;
grant insert (name, email, phone, color) on public.contacts to authenticated;
grant update (name, email, phone, color) on public.contacts to authenticated;
grant select, insert, update, delete on public.contacts to service_role;

alter table public.contacts enable row level security;

drop policy if exists "Logged-in users can read contacts" on public.contacts;
drop policy if exists "Logged-in users can add contacts" on public.contacts;
drop policy if exists "Logged-in users can update contacts" on public.contacts;
drop policy if exists "Delete own or dummy contacts" on public.contacts;
drop policy if exists "Read allowed contacts" on public.contacts;
drop policy if exists "Add own contacts" on public.contacts;
drop policy if exists "Update allowed contacts" on public.contacts;
drop policy if exists "Delete allowed contacts" on public.contacts;

create policy "Read allowed contacts"
  on public.contacts for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or (user_id is null and created_by is null)
    or (user_id is not null and not public.is_guest())
  );

create policy "Add own contacts"
  on public.contacts for insert
  to authenticated
  with check (created_by = (select auth.uid()) and user_id is null);

create policy "Update allowed contacts"
  on public.contacts for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or (user_id is null and created_by is null and public.is_guest())
  )
  with check (
    user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or (user_id is null and created_by is null and public.is_guest())
  );

create policy "Delete allowed contacts"
  on public.contacts for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or (user_id is null and created_by is null and public.is_guest())
  );

commit;

-- -----------------------------------------------------------------------------
-- Optional: Gast-Konten automatisch aufräumen (Datenminimierung)
-- Löscht anonyme Konten, die älter als 30 Tage sind, samt ihren Kontakten.
-- Vorher unter Database → Extensions "pg_cron" aktivieren, dann ausführen:
--
-- select cron.schedule('delete-old-guests', '0 3 * * *',
--   $$ delete from auth.users where is_anonymous and created_at < now() - interval '30 days' $$);
-- -----------------------------------------------------------------------------
