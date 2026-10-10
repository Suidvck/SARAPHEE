-- ========================================================
-- SARAPHEE SUPABASE DATABASE SCHEMA
-- โครงสร้างฐานข้อมูล Supabase สำหรับเว็บกีฬาสีสารภี
-- 
-- วิธีใช้:
-- 1. ไปที่ Supabase Dashboard (https://supabase.com/dashboard)
-- 2. เลือกโปรเจกต์ของคุณ -> เข้าเมนู "SQL Editor"
-- 3. วางโค้ดทั้งหมดนี้แล้วกด "Run"
-- ========================================================

-- 1. ตารางประกาศ (Announcements)
create table if not exists public.announcements (
  id text primary key,
  title text not null,
  body text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- 2. ตารางตารางแข่ง (Matches)
create table if not exists public.matches (
  id text primary key,
  sport text not null,
  time text not null,
  category text default '',
  vs text default '',
  venue text default '',
  created_at timestamptz default now()
);

-- 3. ตารางเชียร์วอลล์ (Cheer Wall)
create table if not exists public.cheer_wall (
  id text primary key,
  message text not null,
  color text default 'neon',
  position_x numeric default 50,
  position_y numeric default 50,
  created_at timestamptz default now()
);

-- 4. ตารางสรุปคะแนน (Scores)
create table if not exists public.scores (
  id text primary key default 'latest',
  gold text default '0',
  silver text default '0',
  bronze text default '0',
  total text default '0',
  goal text default '100',
  rank text default '1',
  colors text default '5',
  cheer text default '0',
  updated_at timestamptz default now()
);

-- ใส่ค่าเริ่มต้นสำหรับคะแนน
insert into public.scores (id, gold, silver, bronze, total, goal, rank, colors, cheer)
values ('latest', '0', '0', '0', '0', '100', '1', '5', '0')
on conflict (id) do nothing;

-- 5. ตารางใบสมัครนักกีฬา (Registrations)
create table if not exists public.registrations (
  id text primary key,
  name text not null,
  gender text default '-',
  level text default '-',
  sports jsonb default '[]'::jsonb,
  team_color text default 'Green',
  status text default 'pending',
  created_at timestamptz default now()
);

-- 6. ตารางรายชื่อนักกีฬา (Roster)
create table if not exists public.roster (
  id text primary key,
  name text not null,
  sport text default '',
  note text default '',
  created_at timestamptz default now()
);

-- 7. ตารางตัวนับพลังเชียร์ & อุปกรณ์ (Cheer Counter & Devices)
create table if not exists public.cheer_counter (
  id text primary key default 'main',
  count integer default 0,
  updated_at timestamptz default now()
);

insert into public.cheer_counter (id, count)
values ('main', 0)
on conflict (id) do nothing;

create table if not exists public.cheer_devices (
  device_id text primary key,
  created_at timestamptz default now()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- อนุญาตให้อ่าน/เขียนข้อมูลได้ทั้งจาก Web API และ Discord Bot
-- ========================================================

alter table public.announcements enable row level security;
alter table public.matches enable row level security;
alter table public.cheer_wall enable row level security;
alter table public.scores enable row level security;
alter table public.registrations enable row level security;
alter table public.roster enable row level security;
alter table public.cheer_counter enable row level security;
alter table public.cheer_devices enable row level security;

-- นโยบาย Announcements
drop policy if exists "Announcements public read" on public.announcements;
create policy "Announcements public read" on public.announcements for select using (true);
drop policy if exists "Announcements service full" on public.announcements;
create policy "Announcements service full" on public.announcements for all using (true) with check (true);

-- นโยบาย Matches
drop policy if exists "Matches public read" on public.matches;
create policy "Matches public read" on public.matches for select using (true);
drop policy if exists "Matches service full" on public.matches;
create policy "Matches service full" on public.matches for all using (true) with check (true);

-- นโยบาย Cheer Wall
drop policy if exists "Cheer wall public read" on public.cheer_wall;
create policy "Cheer wall public read" on public.cheer_wall for select using (true);
drop policy if exists "Cheer wall public insert" on public.cheer_wall;
create policy "Cheer wall public insert" on public.cheer_wall for insert with check (true);
drop policy if exists "Cheer wall service full" on public.cheer_wall;
create policy "Cheer wall service full" on public.cheer_wall for all using (true);

-- นโยบาย Scores
drop policy if exists "Scores public read" on public.scores;
create policy "Scores public read" on public.scores for select using (true);
drop policy if exists "Scores service full" on public.scores;
create policy "Scores service full" on public.scores for all using (true);

-- นโยบาย Registrations
drop policy if exists "Registrations public read" on public.registrations;
create policy "Registrations public read" on public.registrations for select using (true);
drop policy if exists "Registrations public insert" on public.registrations;
create policy "Registrations public insert" on public.registrations for insert with check (true);
drop policy if exists "Registrations service full" on public.registrations;
create policy "Registrations service full" on public.registrations for all using (true);

-- นโยบาย Roster
drop policy if exists "Roster public read" on public.roster;
create policy "Roster public read" on public.roster for select using (true);
drop policy if exists "Roster service full" on public.roster;
create policy "Roster service full" on public.roster for all using (true);

-- นโยบาย Cheer Counter & Devices
drop policy if exists "Cheer counter public read" on public.cheer_counter;
create policy "Cheer counter public read" on public.cheer_counter for select using (true);
drop policy if exists "Cheer counter service full" on public.cheer_counter;
create policy "Cheer counter service full" on public.cheer_counter for all using (true);

drop policy if exists "Cheer devices public read" on public.cheer_devices;
create policy "Cheer devices public read" on public.cheer_devices for select using (true);
drop policy if exists "Cheer devices public insert" on public.cheer_devices;
create policy "Cheer devices public insert" on public.cheer_devices for insert with check (true);
drop policy if exists "Cheer devices service full" on public.cheer_devices;
create policy "Cheer devices service full" on public.cheer_devices for all using (true);
