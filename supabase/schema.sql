-- ============================================================
--  Wine Tasting Journal — スキーマと行レベルセキュリティ
--  Supabase の SQL Editor に貼り付けて実行してください。
-- ============================================================

-- ---------- 記録 ----------
create table if not exists public.notes (
  id            text        not null,
  user_id       uuid        not null references auth.users on delete cascade,
  date          date,
  type          text,
  name          text,
  producer      text,
  country       text,
  region        text,
  grape         text,
  vintage       text,
  alcohol       text,
  rating        int         default 0,
  is_blind      boolean     default false,
  grape_correct boolean,
  has_photo     boolean     default false,
  data          jsonb       not null,
  updated_at    timestamptz default now(),
  primary key (user_id, id)
);

create index if not exists notes_user_date_idx  on public.notes (user_id, date desc);
create index if not exists notes_user_grape_idx on public.notes (user_id, grape);

alter table public.notes enable row level security;

drop policy if exists "notes are private" on public.notes;
create policy "notes are private" on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- 自分で足した選択肢 ----------
create table if not exists public.user_options (
  user_id uuid not null references auth.users on delete cascade,
  key     text not null,
  value   text not null,
  primary key (user_id, key, value)
);

alter table public.user_options enable row level security;

drop policy if exists "options are private" on public.user_options;
create policy "options are private" on public.user_options
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- 品種ごとの模範回答 ----------
create table if not exists public.references (
  id         text not null,
  user_id    uuid not null references auth.users on delete cascade,
  grape      text,
  type       text,
  country    text,
  region     text,
  data       jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

create index if not exists refs_user_grape_idx on public.references (user_id, type, grape);

alter table public.references enable row level security;

drop policy if exists "references are private" on public.references;
create policy "references are private" on public.references
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- ラベル写真（Storage） ----------
insert into storage.buckets (id, name, public)
values ('labels', 'labels', false)
on conflict (id) do nothing;

-- パスは {user_id}/{note_id}.jpg。先頭フォルダ名が自分のUUIDの時だけ許可する。
drop policy if exists "labels are private" on storage.objects;
create policy "labels are private" on storage.objects
  for all
  using  (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);
