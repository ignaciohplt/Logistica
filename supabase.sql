-- Ejecutar este archivo en Supabase > SQL Editor > New query > Run

create table if not exists origin_config (
  id text primary key default 'main',
  name text not null default 'Himetal SA',
  address text not null default 'Rosario, Santa Fe',
  lat double precision not null default -32.9468,
  lng double precision not null default -60.6393,
  updated_at timestamptz default now()
);

create table if not exists customers (
  id text primary key,
  name text not null,
  address text not null,
  phone text default '',
  opening_hours text default '',
  zone text default '',
  notes text default '',
  priority text default 'normal',
  lat double precision default -32.9468,
  lng double precision default -60.6393,
  created_at timestamptz default now()
);

create table if not exists trucks (
  id text primary key,
  name text not null,
  plate text default '',
  driver text default '',
  driver_phone text default '',
  capacity_kg numeric default 0,
  available boolean default true,
  color text default '#2563eb',
  created_at timestamptz default now()
);

create table if not exists orders (
  id text primary key,
  date date not null,
  customer_id text references customers(id) on delete cascade,
  items text default '',
  weight_kg numeric default 0,
  packages integer default 1,
  delivery_window text default 'A coordinar',
  status text default 'pendiente',
  truck_id text references trucks(id) on delete set null,
  created_at timestamptz default now()
);

insert into origin_config (id, name, address, lat, lng)
values ('main', 'Himetal SA', 'Rosario, Santa Fe', -32.9468, -60.6393)
on conflict (id) do nothing;

alter table origin_config enable row level security;
alter table customers enable row level security;
alter table trucks enable row level security;
alter table orders enable row level security;

-- Políticas simples para app privada con login propio.
-- Como la app está protegida por usuario y contraseña, permitimos al anon key leer/escribir estas tablas.
drop policy if exists "app read origin" on origin_config;
drop policy if exists "app write origin" on origin_config;
drop policy if exists "app read customers" on customers;
drop policy if exists "app write customers" on customers;
drop policy if exists "app read trucks" on trucks;
drop policy if exists "app write trucks" on trucks;
drop policy if exists "app read orders" on orders;
drop policy if exists "app write orders" on orders;

create policy "app read origin" on origin_config for select using (true);
create policy "app write origin" on origin_config for all using (true) with check (true);
create policy "app read customers" on customers for select using (true);
create policy "app write customers" on customers for all using (true) with check (true);
create policy "app read trucks" on trucks for select using (true);
create policy "app write trucks" on trucks for all using (true) with check (true);
create policy "app read orders" on orders for select using (true);
create policy "app write orders" on orders for all using (true) with check (true);
