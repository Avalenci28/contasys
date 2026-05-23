-- Schema Supabase para ContaSys (RLS habilitado)
-- Ejecuta esto en el Supabase SQL Editor (recomendado como migración inicial).

-- Tabla de perfil extendida del usuario
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  rol text not null default 'usuario',
  created_at timestamptz not null default now()
);

-- Activar RLS
alter table public.profiles enable row level security;

-- Leer solo la propia fila
create policy "profiles_select_own" on public.profiles
for select
using (auth.uid() = id);

-- Insertar solo la propia fila
create policy "profiles_insert_own" on public.profiles
for insert
with check (auth.uid() = id);

-- Actualizar solo la propia fila
create policy "profiles_update_own" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Eliminar el propio perfil
create policy "profiles_delete_own" on public.profiles
for delete
using (auth.uid() = id);

-- Nota sobre eliminar cuenta completa
-- Desde frontend puro NO se puede borrar auth.users sin una clave privada (Admin API).
-- La eliminación completa (auth.users) se hará con Edge Function/endpoint seguro en el siguiente paso.

