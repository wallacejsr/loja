create extension if not exists "pgcrypto";

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  preco numeric(10, 2) not null default 0,
  preco_promocional numeric(10, 2),
  categoria text not null,
  subcategoria text default '',
  imagens jsonb not null default '[]'::jsonb,
  descricao text default '',
  composicao text default '',
  tamanhos jsonb not null default '[]'::jsonb,
  cores jsonb not null default '[]'::jsonb,
  avaliacoes jsonb not null default '[]'::jsonb,
  mais_vendido boolean not null default false,
  lancamento boolean not null default false,
  estoque integer not null default 0,
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  slug text not null unique,
  imagem text default '',
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  desktop_image text not null,
  mobile_image text,
  link text default '/catalog',
  status text not null default 'Ativo',
  position integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  image text not null,
  link text,
  status text not null default 'Ativo',
  position integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null,
  logo_url text default '',
  email text default '',
  phone text default '',
  instagram text default '',
  facebook text default '',
  tiktok text default '',
  description text default '',
  primary_color text not null default '#ba884b',
  secondary_color text not null default '#1a222b',
  points_per_real numeric(10, 2) not null default 1,
  updated_at timestamptz not null default now()
);

create or replace view public.categories_with_product_count as
select
  c.*,
  count(p.id)::integer as product_count
from public.categories c
left join public.products p on p.categoria = c.nome and p.status = 'Ativo'
group by c.id;

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.banners enable row level security;
alter table public.instagram_posts enable row level security;
alter table public.store_settings enable row level security;

create policy "Public read products" on public.products for select using (status = 'Ativo');
create policy "Public read categories" on public.categories for select using (status = 'Ativo');
create policy "Public read banners" on public.banners for select using (status = 'Ativo');
create policy "Public read instagram posts" on public.instagram_posts for select using (status = 'Ativo');
create policy "Public read store settings" on public.store_settings for select using (true);

create policy "Anon write products" on public.products for all using (true) with check (true);
create policy "Anon write categories" on public.categories for all using (true) with check (true);
create policy "Anon write banners" on public.banners for all using (true) with check (true);
create policy "Anon write instagram posts" on public.instagram_posts for all using (true) with check (true);
create policy "Anon write store settings" on public.store_settings for all using (true) with check (true);
