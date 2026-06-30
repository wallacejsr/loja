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
  shipping_weight_grams integer not null default 500,
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists shipping_weight_grams integer not null default 500;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  slug text not null unique,
  imagem text default '',
  subcategories jsonb not null default '[]'::jsonb,
  status text not null default 'Ativo',
  show_in_menu boolean not null default false,
  menu_order integer not null default 100,
  show_on_home boolean not null default false,
  home_section_title text default '',
  home_section_order integer not null default 100,
  home_section_limit integer not null default 4,
  home_section_filter text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories add column if not exists show_in_menu boolean not null default false;
alter table public.categories add column if not exists menu_order integer not null default 100;
alter table public.categories add column if not exists show_on_home boolean not null default false;
alter table public.categories add column if not exists home_section_title text default '';
alter table public.categories add column if not exists home_section_order integer not null default 100;
alter table public.categories add column if not exists home_section_limit integer not null default 4;
alter table public.categories add column if not exists home_section_filter text not null default 'all';
alter table public.categories add column if not exists subcategories jsonb not null default '[]'::jsonb;

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

create table if not exists public.home_sections (
  id text primary key,
  title text not null,
  source_type text not null default 'category',
  category_name text default '',
  limit_count integer not null default 4,
  link text default '/catalog',
  position integer not null default 100,
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image text not null,
  link text not null default '/catalog',
  cta_label text not null default 'Confira',
  position integer not null default 100,
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prize text not null,
  description text default '',
  image text default '',
  product_id text,
  points_per_ticket integer not null default 100,
  draw_date date,
  cta_label text not null default 'Participar agora',
  cta_link text not null default '/sorteios',
  total_participants integer not null default 0,
  total_tickets integer not null default 0,
  status text not null default 'Ativo',
  position integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.raffles add column if not exists product_id text;
alter table public.raffles add column if not exists cta_label text not null default 'Participar agora';
alter table public.raffles add column if not exists cta_link text not null default '/sorteios';
alter table public.raffles add column if not exists total_participants integer not null default 0;
alter table public.raffles add column if not exists total_tickets integer not null default 0;
alter table public.raffles add column if not exists position integer not null default 100;

create table if not exists public.contact_messages (
  id text primary key,
  name text not null,
  email text not null default '',
  phone text default '',
  order_number text default '',
  message text not null,
  status text not null default 'Novo',
  source text not null default 'site-contact',
  admin_notes text default '',
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages add column if not exists phone text default '';
alter table public.contact_messages add column if not exists order_number text default '';
alter table public.contact_messages add column if not exists status text not null default 'Novo';
alter table public.contact_messages add column if not exists source text not null default 'site-contact';
alter table public.contact_messages add column if not exists admin_notes text default '';
alter table public.contact_messages add column if not exists replied_at timestamptz;
alter table public.contact_messages add column if not exists updated_at timestamptz not null default now();

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null,
  site_title text default '',
  admin_panel_name text default 'DANI Studio',
  site_language text not null default 'pt-BR',
  allow_business_registration boolean not null default false,
  store_currency text not null default 'USD',
  logo_url text default '',
  email text default '',
  phone text default '',
  phone_country text not null default 'BR',
  instagram text default '',
  facebook text default '',
  tiktok text default '',
  description text default '',
  primary_color text not null default '#ba884b',
  secondary_color text not null default '#1a222b',
  points_per_real numeric(10, 2) not null default 1,
  support_sales_phone text default '',
  support_sales_phone_country text not null default 'BR',
  support_sac_phone text default '',
  support_sac_phone_country text not null default 'BR',
  support_email text default '',
  support_week_hours text default '',
  support_saturday_hours text default '',
  shipping_origin_country text not null default 'US',
  shipping_origin_postal_code text default '',
  shipping_origin_city text default '',
  shipping_origin_region text default '',
  shipping_origin_street text default '',
  shipping_origin_number text default '',
  shipping_free_threshold numeric(10, 2) not null default 199,
  shipping_default_product_weight_grams integer not null default 500,
  shipping_package_length_cm numeric(10, 2) not null default 30,
  shipping_package_width_cm numeric(10, 2) not null default 24,
  shipping_package_height_cm numeric(10, 2) not null default 6,
  stripe_enabled boolean not null default false,
  stripe_mode text not null default 'test',
  stripe_currency text not null default 'USD',
  stripe_allow_card boolean not null default true,
  stripe_allow_apple_pay boolean not null default false,
  stripe_allow_google_pay boolean not null default false,
  stripe_success_url text not null default '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  stripe_cancel_url text not null default '/cart',
  updated_at timestamptz not null default now()
);

alter table public.store_settings add column if not exists support_sales_phone text default '';
alter table public.store_settings add column if not exists site_title text default '';
alter table public.store_settings add column if not exists admin_panel_name text default 'DANI Studio';
alter table public.store_settings add column if not exists site_language text not null default 'pt-BR';
alter table public.store_settings add column if not exists allow_business_registration boolean not null default false;
alter table public.store_settings add column if not exists store_currency text not null default 'USD';
alter table public.store_settings add column if not exists phone_country text not null default 'BR';
alter table public.store_settings add column if not exists support_sac_phone text default '';
alter table public.store_settings add column if not exists support_sales_phone_country text not null default 'BR';
alter table public.store_settings add column if not exists support_sac_phone_country text not null default 'BR';
alter table public.store_settings add column if not exists support_email text default '';
alter table public.store_settings add column if not exists support_week_hours text default '';
alter table public.store_settings add column if not exists support_saturday_hours text default '';
alter table public.store_settings add column if not exists shipping_origin_country text not null default 'US';
alter table public.store_settings add column if not exists shipping_origin_postal_code text default '';
alter table public.store_settings add column if not exists shipping_origin_city text default '';
alter table public.store_settings add column if not exists shipping_origin_region text default '';
alter table public.store_settings add column if not exists shipping_origin_street text default '';
alter table public.store_settings add column if not exists shipping_origin_number text default '';
alter table public.store_settings add column if not exists shipping_free_threshold numeric(10, 2) not null default 199;
alter table public.store_settings add column if not exists shipping_default_product_weight_grams integer not null default 500;
alter table public.store_settings add column if not exists shipping_package_length_cm numeric(10, 2) not null default 30;
alter table public.store_settings add column if not exists shipping_package_width_cm numeric(10, 2) not null default 24;
alter table public.store_settings add column if not exists shipping_package_height_cm numeric(10, 2) not null default 6;
alter table public.store_settings add column if not exists stripe_enabled boolean not null default false;
alter table public.store_settings add column if not exists stripe_mode text not null default 'test';
alter table public.store_settings add column if not exists stripe_currency text not null default 'USD';
alter table public.store_settings add column if not exists stripe_allow_card boolean not null default true;
alter table public.store_settings add column if not exists stripe_allow_apple_pay boolean not null default false;
alter table public.store_settings add column if not exists stripe_allow_google_pay boolean not null default false;
alter table public.store_settings add column if not exists stripe_success_url text not null default '/checkout/success?session_id={CHECKOUT_SESSION_ID}';
alter table public.store_settings add column if not exists stripe_cancel_url text not null default '/cart';

create table if not exists public.payment_gateway_credentials (
  provider text not null,
  mode text not null,
  publishable_key_encrypted text not null default '',
  secret_key_encrypted text not null default '',
  webhook_secret_encrypted text not null default '',
  updated_at timestamptz not null default now(),
  primary key (provider, mode)
);

create table if not exists public.stripe_checkout_orders (
  order_number text primary key,
  stripe_session_id text unique,
  stripe_payment_intent_id text default '',
  provider text not null default 'stripe',
  mode text not null default 'test',
  session_status text not null default 'open',
  payment_status text not null default 'unpaid',
  order_status text not null default 'Aguardando Pagamento',
  currency text not null default 'USD',
  subtotal numeric(10, 2) not null default 0,
  shipping numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  shipping_method text default '',
  payment_method text not null default 'Stripe Checkout',
  customer jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  source text not null default 'stripe_checkout',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  last_event_id text default '',
  last_event_type text default '',
  logs jsonb not null default '[]'::jsonb
);

alter table public.stripe_checkout_orders add column if not exists payment_method text not null default 'Stripe Checkout';
alter table public.stripe_checkout_orders add column if not exists shipped_at timestamptz;
alter table public.stripe_checkout_orders add column if not exists delivered_at timestamptz;
alter table public.stripe_checkout_orders add column if not exists logs jsonb not null default '[]'::jsonb;

create table if not exists public.stripe_webhook_logs (
  event_id text primary key,
  event_type text not null,
  order_number text default '',
  stripe_session_id text default '',
  livemode boolean not null default false,
  status text not null default 'received',
  message text default '',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

drop view if exists public.categories_with_product_count;

create view public.categories_with_product_count as
select
  c.*,
  count(p.id)::integer as product_count
from public.categories c
left join public.products p on p.categoria = c.nome and p.status = 'Ativo'
group by c.id;

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.banners enable row level security;
alter table public.home_sections enable row level security;
alter table public.home_cards enable row level security;
alter table public.raffles enable row level security;
alter table public.contact_messages enable row level security;
alter table public.instagram_posts enable row level security;
alter table public.store_settings enable row level security;
alter table public.payment_gateway_credentials enable row level security;
alter table public.stripe_checkout_orders enable row level security;
alter table public.stripe_webhook_logs enable row level security;

revoke all on table public.payment_gateway_credentials from anon, authenticated;
revoke all on table public.stripe_checkout_orders from anon, authenticated;
revoke all on table public.stripe_webhook_logs from anon, authenticated;

drop policy if exists "Public read products" on public.products;
drop policy if exists "Public read categories" on public.categories;
drop policy if exists "Public read banners" on public.banners;
drop policy if exists "Public read home sections" on public.home_sections;
drop policy if exists "Public read home cards" on public.home_cards;
drop policy if exists "Public read raffles" on public.raffles;
drop policy if exists "Public read contact messages" on public.contact_messages;
drop policy if exists "Public read instagram posts" on public.instagram_posts;
drop policy if exists "Public read store settings" on public.store_settings;
drop policy if exists "Anon write products" on public.products;
drop policy if exists "Anon write categories" on public.categories;
drop policy if exists "Anon write banners" on public.banners;
drop policy if exists "Anon write home sections" on public.home_sections;
drop policy if exists "Anon write home cards" on public.home_cards;
drop policy if exists "Anon write raffles" on public.raffles;
drop policy if exists "Anon write contact messages" on public.contact_messages;
drop policy if exists "Anon write instagram posts" on public.instagram_posts;
drop policy if exists "Anon write store settings" on public.store_settings;

create policy "Public read products" on public.products for select using (status = 'Ativo');
create policy "Public read categories" on public.categories for select using (status = 'Ativo');
create policy "Public read banners" on public.banners for select using (status = 'Ativo');
create policy "Public read home sections" on public.home_sections for select using (status = 'Ativo');
create policy "Public read home cards" on public.home_cards for select using (status = 'Ativo');
create policy "Public read raffles" on public.raffles for select using (true);
create policy "Public read contact messages" on public.contact_messages for select using (true);
create policy "Public read instagram posts" on public.instagram_posts for select using (status = 'Ativo');
create policy "Public read store settings" on public.store_settings for select using (true);

create policy "Anon write products" on public.products for all using (true) with check (true);
create policy "Anon write categories" on public.categories for all using (true) with check (true);
create policy "Anon write banners" on public.banners for all using (true) with check (true);
create policy "Anon write home sections" on public.home_sections for all using (true) with check (true);
create policy "Anon write home cards" on public.home_cards for all using (true) with check (true);
create policy "Anon write raffles" on public.raffles for all using (true) with check (true);
create policy "Anon write contact messages" on public.contact_messages for all using (true) with check (true);
create policy "Anon write instagram posts" on public.instagram_posts for all using (true) with check (true);
create policy "Anon write store settings" on public.store_settings for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Anon upload product images" on storage.objects;
drop policy if exists "Anon update product images" on storage.objects;
drop policy if exists "Anon delete product images" on storage.objects;

create policy "Public read product images" on storage.objects
for select using (bucket_id = 'product-images');

create policy "Anon upload product images" on storage.objects
for insert with check (bucket_id = 'product-images');

create policy "Anon update product images" on storage.objects
for update using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

create policy "Anon delete product images" on storage.objects
for delete using (bucket_id = 'product-images');
