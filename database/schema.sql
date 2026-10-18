create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.room_settings (
  id boolean primary key default true check (id),
  roommate_count integer not null default 3 check (roommate_count > 0)
);

insert into public.room_settings (id, roommate_count)
values (true, 3)
on conflict (id) do nothing;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (category in ('Dairy', 'Vegetables', 'Spices', 'Other')),
  description text,
  is_settled boolean not null default false,
  client_local_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.settlement_transactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id),
  to_user_id uuid not null references public.users(id),
  amount numeric(12, 2) not null check (amount > 0),
  settled_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);
