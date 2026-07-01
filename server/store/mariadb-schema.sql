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
  admin_panel_name VARCHAR(255) NOT NULL DEFAULT 'Admin Panel',
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
  payment_method VARCHAR(191) NOT NULL DEFAULT 'Stripe Checkout',
  customer LONGTEXT NOT NULL,
  shipping_address LONGTEXT NOT NULL,
  items LONGTEXT NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'stripe_checkout',
  metadata LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  shipped_at DATETIME NULL,
  delivered_at DATETIME NULL,
  last_event_id VARCHAR(191) NOT NULL DEFAULT '',
  last_event_type VARCHAR(120) NOT NULL DEFAULT '',
  logs LONGTEXT NULL,
  UNIQUE KEY stripe_checkout_orders_session_unique (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE stripe_checkout_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(191) NOT NULL DEFAULT 'Stripe Checkout';
ALTER TABLE stripe_checkout_orders ADD COLUMN IF NOT EXISTS shipped_at DATETIME NULL;
ALTER TABLE stripe_checkout_orders ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL;
ALTER TABLE stripe_checkout_orders ADD COLUMN IF NOT EXISTS logs LONGTEXT NULL;

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

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  source VARCHAR(80) NOT NULL DEFAULT 'footer-newsletter',
  coupon_code VARCHAR(80) NOT NULL DEFAULT 'BEMVINDA10',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY newsletter_subscribers_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Foundation for production-grade customer accounts, sessions, carts and orders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  tax_document VARCHAR(80) NOT NULL DEFAULT '',
  tax_document_type VARCHAR(30) NOT NULL DEFAULT 'tax_id',
  birth_date DATE NULL,
  gender VARCHAR(40) NOT NULL DEFAULT '',
  phone_e164 VARCHAR(40) NOT NULL DEFAULT '',
  phone_country VARCHAR(20) NOT NULL DEFAULT 'US',
  phone_national VARCHAR(80) NOT NULL DEFAULT '',
  registration_type VARCHAR(10) NOT NULL DEFAULT 'F',
  corporate_name VARCHAR(255) NOT NULL DEFAULT '',
  state_registration VARCHAR(120) NOT NULL DEFAULT '',
  allow_marketing TINYINT(1) NOT NULL DEFAULT 1,
  block_purchases TINYINT(1) NOT NULL DEFAULT 0,
  newsletter_subscribed TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY customers_email_unique (email),
  KEY customers_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(191) NOT NULL,
  label VARCHAR(120) NOT NULL,
  country VARCHAR(20) NOT NULL DEFAULT 'US',
  postal_code VARCHAR(30) NOT NULL,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(50) NOT NULL DEFAULT '',
  complement VARCHAR(255) NOT NULL DEFAULT '',
  neighborhood VARCHAR(120) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL,
  region VARCHAR(120) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY customer_addresses_customer_idx (customer_id),
  KEY customer_addresses_primary_idx (customer_id, is_primary),
  CONSTRAINT customer_addresses_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY admin_users_email_unique (email),
  KEY admin_users_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_sessions (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(191) NOT NULL,
  session_token_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(80) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY customer_sessions_token_hash_unique (session_token_hash),
  KEY customer_sessions_customer_idx (customer_id),
  KEY customer_sessions_expires_idx (expires_at),
  CONSTRAINT customer_sessions_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_benefits (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(191) NOT NULL,
  benefit_type VARCHAR(60) NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  coupon_code VARCHAR(80) NOT NULL DEFAULT '',
  discount_type VARCHAR(30) NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  linked_email VARCHAR(255) NOT NULL DEFAULT '',
  linked_newsletter_subscriber_id VARCHAR(191) NULL,
  metadata LONGTEXT NULL,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  used_order_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY customer_benefits_customer_idx (customer_id),
  KEY customer_benefits_status_idx (status),
  KEY customer_benefits_used_order_idx (used_order_id),
  CONSTRAINT customer_benefits_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE CASCADE,
  CONSTRAINT customer_benefits_newsletter_fk
    FOREIGN KEY (linked_newsletter_subscriber_id) REFERENCES newsletter_subscribers (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  coupon_type VARCHAR(30) NOT NULL DEFAULT 'percentage',
  coupon_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  usage_limit_total INT NOT NULL DEFAULT 0,
  usage_limit_per_customer INT NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  applies_to_scope VARCHAR(40) NOT NULL DEFAULT 'all',
  applies_to_payload LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME NULL,
  UNIQUE KEY coupons_code_unique (code),
  KEY coupons_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(191) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_method VARCHAR(191) NOT NULL DEFAULT '',
  shipping_quote_snapshot LONGTEXT NULL,
  applied_coupon_id VARCHAR(191) NULL,
  applied_benefit_id VARCHAR(191) NULL,
  converted_order_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  converted_at DATETIME NULL,
  KEY carts_customer_status_idx (customer_id, status),
  KEY carts_status_idx (status),
  CONSTRAINT carts_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE CASCADE,
  CONSTRAINT carts_coupon_fk
    FOREIGN KEY (applied_coupon_id) REFERENCES coupons (id)
    ON DELETE SET NULL,
  CONSTRAINT carts_benefit_fk
    FOREIGN KEY (applied_benefit_id) REFERENCES customer_benefits (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  cart_id VARCHAR(191) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  sku_snapshot VARCHAR(191) NOT NULL DEFAULT '',
  unit_price_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  size_label VARCHAR(80) NOT NULL DEFAULT '',
  color_label VARCHAR(80) NOT NULL DEFAULT '',
  metadata LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY cart_items_line_unique (cart_id, product_id, size_label, color_label),
  KEY cart_items_cart_idx (cart_id),
  CONSTRAINT cart_items_cart_fk
    FOREIGN KEY (cart_id) REFERENCES carts (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  order_number VARCHAR(191) NOT NULL,
  customer_id VARCHAR(191) NULL,
  cart_id VARCHAR(191) NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'storefront',
  status VARCHAR(60) NOT NULL DEFAULT 'pending_payment',
  payment_provider VARCHAR(40) NOT NULL DEFAULT '',
  payment_method VARCHAR(80) NOT NULL DEFAULT '',
  payment_reference VARCHAR(191) NOT NULL DEFAULT '',
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_id VARCHAR(191) NULL,
  customer_benefit_id VARCHAR(191) NULL,
  customer_snapshot LONGTEXT NOT NULL,
  billing_address_snapshot LONGTEXT NULL,
  shipping_address_snapshot LONGTEXT NOT NULL,
  metadata LONGTEXT NULL,
  placed_at DATETIME NULL,
  paid_at DATETIME NULL,
  shipped_at DATETIME NULL,
  delivered_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY orders_order_number_unique (order_number),
  KEY orders_customer_idx (customer_id),
  KEY orders_status_idx (status),
  CONSTRAINT orders_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE SET NULL,
  CONSTRAINT orders_cart_fk
    FOREIGN KEY (cart_id) REFERENCES carts (id)
    ON DELETE SET NULL,
  CONSTRAINT orders_coupon_fk
    FOREIGN KEY (coupon_id) REFERENCES coupons (id)
    ON DELETE SET NULL,
  CONSTRAINT orders_benefit_fk
    FOREIGN KEY (customer_benefit_id) REFERENCES customer_benefits (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  order_id VARCHAR(191) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  sku_snapshot VARCHAR(191) NOT NULL DEFAULT '',
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  size_label VARCHAR(80) NOT NULL DEFAULT '',
  color_label VARCHAR(80) NOT NULL DEFAULT '',
  metadata LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY order_items_order_idx (order_id),
  CONSTRAINT order_items_order_fk
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_logs (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  order_id VARCHAR(191) NOT NULL,
  status VARCHAR(60) NOT NULL,
  actor_type VARCHAR(30) NOT NULL DEFAULT 'system',
  actor_id VARCHAR(191) NOT NULL DEFAULT '',
  actor_name VARCHAR(191) NOT NULL DEFAULT '',
  ip_address VARCHAR(80) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  metadata LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY order_status_logs_order_idx (order_id),
  CONSTRAINT order_status_logs_order_fk
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_type VARCHAR(30) NOT NULL DEFAULT 'system',
  actor_id VARCHAR(191) NOT NULL DEFAULT '',
  actor_email VARCHAR(255) NOT NULL DEFAULT '',
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  action VARCHAR(80) NOT NULL,
  ip_address VARCHAR(80) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  diff_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY audit_logs_entity_idx (entity_type, entity_id),
  KEY audit_logs_actor_idx (actor_type, actor_id),
  KEY audit_logs_action_idx (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
