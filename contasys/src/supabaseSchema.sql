-- SQL sugerido (ejecuta en Supabase SQL Editor)
-- Crea una tabla para guardar datos básicos del usuario registrado.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Permitir que el usuario lea solo su fila
create policy "profiles_select_own" on public.profiles
for select
using (auth.uid() = id);

-- Permitir que el usuario inserte su fila (después del sign up)
create policy "profiles_insert_own" on public.profiles
for insert
with check (auth.uid() = id);

-- Permitir actualizaciones (opcional)
create policy "profiles_update_own" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

