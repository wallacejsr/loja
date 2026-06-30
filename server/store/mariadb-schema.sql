CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_promocional DECIMAL(10,2) NULL,
  categoria VARCHAR(120) NOT NULL,
  subcategoria VARCHAR(120) NOT NULL DEFAULT '',
  imagens LONGTEXT NOT NULL,
  descricao TEXT NOT NULL,
  composicao TEXT NOT NULL,
  tamanhos LONGTEXT NOT NULL,
  cores LONGTEXT NOT NULL,
  avaliacoes LONGTEXT NOT NULL,
  mais_vendido TINYINT(1) NOT NULL DEFAULT 0,
  lancamento TINYINT(1) NOT NULL DEFAULT 0,
  estoque INT NOT NULL DEFAULT 0,
  shipping_weight_grams INT NOT NULL DEFAULT 500,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  imagem TEXT NOT NULL,
  subcategories LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  show_in_menu TINYINT(1) NOT NULL DEFAULT 1,
  menu_order INT NOT NULL DEFAULT 100,
  show_on_home TINYINT(1) NOT NULL DEFAULT 0,
  home_section_title VARCHAR(255) NOT NULL,
  home_section_order INT NOT NULL DEFAULT 100,
  home_section_limit INT NOT NULL DEFAULT 4,
  home_section_filter VARCHAR(40) NOT NULL DEFAULT 'all',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY categories_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  desktop_image TEXT NOT NULL,
  mobile_image TEXT NOT NULL,
  link TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  position INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS home_sections (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  category_name VARCHAR(255) NOT NULL DEFAULT '',
  limit_count INT NOT NULL DEFAULT 4,
  link TEXT NOT NULL,
  position INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS home_cards (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image TEXT NOT NULL,
  link TEXT NOT NULL,
  cta_label VARCHAR(120) NOT NULL DEFAULT 'Confira',
  position INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS raffles (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  prize VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  product_id VARCHAR(191) NULL,
  points_per_ticket INT NOT NULL DEFAULT 0,
  draw_date VARCHAR(40) NULL,
  cta_label VARCHAR(120) NOT NULL DEFAULT 'Participar agora',
  cta_link TEXT NOT NULL,
  total_participants INT NOT NULL DEFAULT 0,
  total_tickets INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  position INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS instagram_posts (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  image TEXT NOT NULL,
  link TEXT NOT NULL,
  position INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_settings (
  id INT NOT NULL PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL,
  site_title VARCHAR(255) NOT NULL,
  admin_panel_name VARCHAR(255) NOT NULL DEFAULT 'DANI Studio',
  site_language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  allow_business_registration TINYINT(1) NOT NULL DEFAULT 0,
  store_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  logo_url TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  phone_country VARCHAR(20) NOT NULL DEFAULT 'US',
  instagram TEXT NOT NULL,
  facebook TEXT NOT NULL,
  tiktok TEXT NOT NULL,
  description TEXT NOT NULL,
  primary_color VARCHAR(30) NOT NULL,
  secondary_color VARCHAR(30) NOT NULL,
  points_per_real DECIMAL(10,2) NOT NULL DEFAULT 1,
  support_sales_phone VARCHAR(80) NOT NULL,
  support_sales_phone_country VARCHAR(20) NOT NULL DEFAULT 'US',
  support_sac_phone VARCHAR(80) NOT NULL,
  support_sac_phone_country VARCHAR(20) NOT NULL DEFAULT 'US',
  support_email VARCHAR(255) NOT NULL,
  support_week_hours VARCHAR(255) NOT NULL,
  support_saturday_hours VARCHAR(255) NOT NULL,
  shipping_origin_country VARCHAR(20) NOT NULL DEFAULT 'US',
  shipping_origin_postal_code VARCHAR(30) NOT NULL,
  shipping_origin_city VARCHAR(120) NOT NULL,
  shipping_origin_region VARCHAR(120) NOT NULL,
  shipping_origin_street VARCHAR(255) NOT NULL,
  shipping_origin_number VARCHAR(40) NOT NULL,
  shipping_free_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_default_product_weight_grams INT NOT NULL DEFAULT 500,
  shipping_package_length_cm DECIMAL(10,2) NOT NULL DEFAULT 30,
  shipping_package_width_cm DECIMAL(10,2) NOT NULL DEFAULT 24,
  shipping_package_height_cm DECIMAL(10,2) NOT NULL DEFAULT 6,
  stripe_enabled TINYINT(1) NOT NULL DEFAULT 0,
  stripe_mode VARCHAR(10) NOT NULL DEFAULT 'test',
  stripe_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  stripe_allow_card TINYINT(1) NOT NULL DEFAULT 1,
  stripe_allow_apple_pay TINYINT(1) NOT NULL DEFAULT 0,
  stripe_allow_google_pay TINYINT(1) NOT NULL DEFAULT 0,
  stripe_success_url VARCHAR(255) NOT NULL DEFAULT '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  stripe_cancel_url VARCHAR(255) NOT NULL DEFAULT '/cart',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_mode VARCHAR(10) NOT NULL DEFAULT 'test';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_allow_card TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_allow_apple_pay TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_allow_google_pay TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_success_url VARCHAR(255) NOT NULL DEFAULT '/checkout/success?session_id={CHECKOUT_SESSION_ID}';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS stripe_cancel_url VARCHAR(255) NOT NULL DEFAULT '/cart';

CREATE TABLE IF NOT EXISTS payment_gateway_credentials (
  provider VARCHAR(40) NOT NULL,
  mode VARCHAR(10) NOT NULL,
  publishable_key_encrypted LONGTEXT NOT NULL,
  secret_key_encrypted LONGTEXT NOT NULL,
  webhook_secret_encrypted LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider, mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_checkout_orders (
  order_number VARCHAR(191) NOT NULL PRIMARY KEY,
  stripe_session_id VARCHAR(191) NULL,
  stripe_payment_intent_id VARCHAR(191) NOT NULL DEFAULT '',
  provider VARCHAR(40) NOT NULL DEFAULT 'stripe',
  mode VARCHAR(10) NOT NULL DEFAULT 'test',
  session_status VARCHAR(40) NOT NULL DEFAULT 'open',
  payment_status VARCHAR(40) NOT NULL DEFAULT 'unpaid',
  order_status VARCHAR(60) NOT NULL DEFAULT 'Aguardando Pagamento',
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_method VARCHAR(191) NOT NULL DEFAULT '',
  customer LONGTEXT NOT NULL,
  shipping_address LONGTEXT NOT NULL,
  items LONGTEXT NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'stripe_checkout',
  metadata LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  last_event_id VARCHAR(191) NOT NULL DEFAULT '',
  last_event_type VARCHAR(120) NOT NULL DEFAULT '',
  UNIQUE KEY stripe_checkout_orders_session_unique (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
  event_id VARCHAR(191) NOT NULL PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  order_number VARCHAR(191) NOT NULL DEFAULT '',
  stripe_session_id VARCHAR(191) NOT NULL DEFAULT '',
  livemode TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'received',
  message TEXT NOT NULL,
  payload LONGTEXT NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  order_number VARCHAR(120) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Novo',
  source VARCHAR(80) NOT NULL DEFAULT 'site-contact',
  admin_notes TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  replied_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
